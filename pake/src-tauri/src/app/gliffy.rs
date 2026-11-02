// Native services for the Gliffy frontend (see js/polyfill.js): file dialogs,
// file access limited to paths the user picked, and the window close handshake.
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use tauri::ipc::Response;
use tauri::{command, AppHandle, Manager, State, WebviewWindow, Window};
use tauri_plugin_dialog::DialogExt;

// How long the page gets to answer a close request before the app exits anyway,
// so a frozen page can never make the window impossible to close.
const CLOSE_ACK_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Default)]
pub struct GliffyState {
    allowed_paths: Mutex<HashSet<String>>,
    close_pending: AtomicBool,
    exiting: AtomicBool,
}

impl GliffyState {
    fn allow(&self, path: &str) {
        if let Ok(mut paths) = self.allowed_paths.lock() {
            paths.insert(path.to_string());
        }
    }

    fn check(&self, path: &str) -> Result<(), String> {
        let allowed = self
            .allowed_paths
            .lock()
            .map(|paths| paths.contains(path))
            .unwrap_or(false);
        if allowed {
            Ok(())
        } else {
            Err(format!("File was not selected in a dialog: {path}"))
        }
    }
}

#[derive(serde::Deserialize)]
pub struct FilterDef {
    name: String,
    extensions: Vec<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveDialogParams {
    suggested_name: Option<String>,
    filters: Option<Vec<FilterDef>>,
}

#[derive(serde::Serialize)]
pub struct SaveDialogResult {
    path: String,
}

#[derive(serde::Deserialize)]
pub struct OpenDialogParams {
    filters: Option<Vec<FilterDef>>,
}

#[derive(serde::Serialize)]
pub struct OpenDialogResult {
    path: String,
    name: String,
}

#[derive(serde::Deserialize)]
pub struct WriteFileParams {
    path: String,
    data: Vec<u8>,
}

#[command]
pub async fn save_file_dialog(
    window: WebviewWindow,
    state: State<'_, GliffyState>,
    params: SaveDialogParams,
) -> Result<Option<SaveDialogResult>, String> {
    let mut builder = window.dialog().file().set_parent(&window);
    if let Some(name) = params.suggested_name {
        builder = builder.set_file_name(&name);
    }
    for filter in params.filters.unwrap_or_default() {
        let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
        builder = builder.add_filter(&filter.name, &extensions);
    }
    Ok(builder.blocking_save_file().map(|file| {
        let path = file.to_string();
        state.allow(&path);
        SaveDialogResult { path }
    }))
}

#[command]
pub async fn open_file_dialog(
    window: WebviewWindow,
    state: State<'_, GliffyState>,
    params: OpenDialogParams,
) -> Result<Option<OpenDialogResult>, String> {
    let mut builder = window.dialog().file().set_parent(&window);
    for filter in params.filters.unwrap_or_default() {
        let extensions: Vec<&str> = filter.extensions.iter().map(String::as_str).collect();
        builder = builder.add_filter(&filter.name, &extensions);
    }
    Ok(builder.blocking_pick_file().map(|file| {
        let path = file.to_string();
        state.allow(&path);
        let name = Path::new(&path)
            .file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_default();
        OpenDialogResult { path, name }
    }))
}

#[command]
pub async fn read_file_content(
    state: State<'_, GliffyState>,
    path: String,
) -> Result<Response, String> {
    state.check(&path)?;
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {e}"))?;
    Ok(Response::new(bytes))
}

#[command]
pub async fn write_file_content(
    state: State<'_, GliffyState>,
    params: WriteFileParams,
) -> Result<(), String> {
    state.check(&params.path)?;
    write_atomic(Path::new(&params.path), &params.data)
        .map_err(|e| format!("Failed to write file: {e}"))
}

// Writes beside the target and renames over it, so a crash or full disk during
// the write leaves the user's existing diagram intact.
fn write_atomic(path: &Path, data: &[u8]) -> std::io::Result<()> {
    // rename() would silently replace a read-only file on Windows.
    if let Ok(metadata) = fs::metadata(path) {
        if metadata.permissions().readonly() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                "the file is read-only",
            ));
        }
    }
    let temp = temp_path(path);
    let result = fs::write(&temp, data).and_then(|_| fs::rename(&temp, path));
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}

fn temp_path(path: &Path) -> PathBuf {
    let mut name = path.file_name().unwrap_or_default().to_os_string();
    name.push(".gliffy-tmp");
    path.with_file_name(name)
}

#[command]
pub fn gliffy_close_ack(state: State<'_, GliffyState>) {
    state.close_pending.store(false, Ordering::SeqCst);
}

#[command]
pub fn gliffy_exit(app: AppHandle, state: State<'_, GliffyState>) {
    state.exiting.store(true, Ordering::SeqCst);
    app.exit(0);
}

/// Asks the page to confirm a window close. Returns true when the close must be
/// held back because the page now decides (it replies through `gliffy_exit`).
pub fn intercept_close(window: &Window) -> bool {
    let app = window.app_handle().clone();
    let state = app.state::<GliffyState>();
    if state.exiting.load(Ordering::SeqCst) {
        return false;
    }
    state.close_pending.store(true, Ordering::SeqCst);
    if let Some(webview) = app.get_webview_window(window.label()) {
        let _ = webview.eval("window.__gliffyRequestClose && window.__gliffyRequestClose()");
    }
    let timeout_app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(CLOSE_ACK_TIMEOUT).await;
        let state = timeout_app.state::<GliffyState>();
        if state.close_pending.load(Ordering::SeqCst) {
            state.exiting.store(true, Ordering::SeqCst);
            timeout_app.exit(0);
        }
    });
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("gliffy-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn write_atomic_replaces_content_and_leaves_no_temp_file() {
        let dir = temp_dir("replace");
        let file = dir.join("a.gliffy");
        fs::write(&file, "old").unwrap();
        write_atomic(&file, b"new").unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "new");
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn write_atomic_refuses_read_only_file() {
        let dir = temp_dir("readonly");
        let file = dir.join("a.gliffy");
        fs::write(&file, "old").unwrap();
        let mut permissions = fs::metadata(&file).unwrap().permissions();
        permissions.set_readonly(true);
        fs::set_permissions(&file, permissions.clone()).unwrap();
        assert!(write_atomic(&file, b"new").is_err());
        assert_eq!(fs::read_to_string(&file).unwrap(), "old");
        permissions.set_readonly(false);
        fs::set_permissions(&file, permissions).unwrap();
        fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn only_dialog_selected_paths_are_allowed() {
        let state = GliffyState::default();
        assert!(state.check("C:\\a.gliffy").is_err());
        state.allow("C:\\a.gliffy");
        assert!(state.check("C:\\a.gliffy").is_ok());
        assert!(state.check("C:\\b.gliffy").is_err());
    }
}
