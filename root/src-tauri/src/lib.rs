#[cfg_attr(mobile, tauri::mobile_entry_point)]
use tauri::{command, AppHandle, Manager};
use std::fs;
use std::path::PathBuf;
use aes_gcm::{Aes256Gcm, Key};
use aes_gcm::aead::{Aead, KeyInit, generic_array::GenericArray};
use rand::RngCore;
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;
use base64::{engine::general_purpose, Engine as _};
use std::path::Path;
use tauri::async_runtime::spawn_blocking;

const PBKDF2_ITER: u32 = 100_000;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const KEY_LEN: usize = 32;
const DATA_FILENAME: &str = "vault.dat";

fn get_data_file_path(app: &AppHandle) -> PathBuf {
    let dir = app.path().app_data_dir().expect("No app data dir");
    println!("[DEBUG] App data dir: {}", dir.display());
    let path = dir.join(DATA_FILENAME);
    println!("[DEBUG] Data file path: {}", path.display());
    path
}

fn derive_key(password: &str, salt: &[u8]) -> [u8; KEY_LEN] {
    let mut key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, PBKDF2_ITER, &mut key);
    key
}

#[command]
async fn save_data(app: AppHandle, master_password: String, data: String) -> Result<(), String> {
    let app = app.clone();
    spawn_blocking(move || {
        let mut salt = [0u8; SALT_LEN];
        rand::rng().fill_bytes(&mut salt);
        let key = derive_key(&master_password, &salt);
        let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
        let mut nonce = [0u8; NONCE_LEN];
        rand::rng().fill_bytes(&mut nonce);
        let nonce_ga = GenericArray::from_slice(&nonce);
        let ciphertext = cipher.encrypt(nonce_ga, data.as_bytes()).map_err(|e| {
            println!("[ERROR] Encryption failed: {}", e);
            e.to_string()
        })?;
        let file_content = format!("{}:{}:{}",
            general_purpose::STANDARD.encode(salt),
            general_purpose::STANDARD.encode(nonce),
            general_purpose::STANDARD.encode(ciphertext)
        );
        let path = get_data_file_path(&app);
        if let Err(e) = fs::create_dir_all(path.parent().unwrap()) {
            println!("[ERROR] Failed to create data dir: {}", e);
            return Err(e.to_string());
        }
        if let Err(e) = fs::write(&path, file_content) {
            println!("[ERROR] Failed to write data file: {}", e);
            return Err(e.to_string());
        }
        println!("[DEBUG] Data file written successfully: {}", path.display());
        Ok(())
    }).await.unwrap_or_else(|e| Err(format!("Background thread error: {e}")))
}

#[command]
fn load_data(app: AppHandle, master_password: String) -> Result<String, String> {
    let path = get_data_file_path(&app);
    let file_content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let parts: Vec<&str> = file_content.split(':').collect();
    if parts.len() != 3 {
        return Err("Corrupt data file".to_string());
    }
    let salt = general_purpose::STANDARD.decode(parts[0]).map_err(|e| e.to_string())?;
    let nonce = general_purpose::STANDARD.decode(parts[1]).map_err(|e| e.to_string())?;
    let ciphertext = general_purpose::STANDARD.decode(parts[2]).map_err(|e| e.to_string())?;
    let key = derive_key(&master_password, &salt);
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(&key));
    let nonce_ga = GenericArray::from_slice(&nonce);
    let plaintext = cipher.decrypt(nonce_ga, ciphertext.as_ref()).map_err(|_| "Incorrect password or corrupt file".to_string())?;
    Ok(String::from_utf8(plaintext).map_err(|e| e.to_string())?)
}

#[command]
fn export_data(app: AppHandle) -> Result<String, String> {
    let path = get_data_file_path(&app);
    let file_content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(file_content)
}

#[command]
async fn import_data(app: AppHandle, file_content: String) -> Result<(), String> {
    let app = app.clone();
    spawn_blocking(move || {
        let path = get_data_file_path(&app);
        if let Err(e) = fs::create_dir_all(path.parent().unwrap()) {
            println!("[ERROR] Failed to create data dir: {}", e);
            return Err(e.to_string());
        }
        if let Err(e) = fs::write(&path, file_content) {
            println!("[ERROR] Failed to write data file: {}", e);
            return Err(e.to_string());
        }
        println!("[DEBUG] Data file imported successfully: {}", path.display());
        Ok(())
    }).await.unwrap_or_else(|e| Err(format!("Background thread error: {e}")))
}

#[command]
fn has_data_file(app: AppHandle) -> Result<bool, String> {
    let path = get_data_file_path(&app);
    Ok(Path::new(&path).exists())
}

#[command]
fn clear_data_file(app: AppHandle) -> Result<(), String> {
    let path = get_data_file_path(&app);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![save_data, load_data, export_data, import_data, has_data_file, clear_data_file])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
