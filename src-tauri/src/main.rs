// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

static GENERIC_FONT: &'static [u8] = include_bytes!("./Roboto-Regular.ttf");

mod tile_server;
use tokio::sync::Mutex;
use std::{path, sync::{Arc}};

struct AppState {
    server: Arc<Mutex<tile_server::TileServer>>,
}

#[tauri::command]
async fn catalog_fonts(app_state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let server = app_state.server.lock().await;
    Ok(server.get_font_layers_names())
}

#[tauri::command]
async fn catalog_tiles(app_state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    let server = app_state.server.lock().await;
    Ok(server.get_tile_layers_names())
}

#[tauri::command]
async fn upload_mbtile(app_state: tauri::State<'_, AppState>, file: String) -> Result<String, String> {
    let mut server = app_state.server.lock().await;
    server.new_mbtiles(path::PathBuf::from(file)).await
}

#[tauri::command]
async fn remove_mbtile(app_state: tauri::State<'_, AppState>, layer: String) -> Result<String, String> {
    let mut server = app_state.server.lock().await;
    server.remove_tile(layer).await
}

#[tauri::command]
async fn get_address(app_state: tauri::State<'_, AppState>) -> Result<String, String> {
    let server = app_state.server.lock().await;
    Ok(server.address.clone())
}

#[tokio::main]
async fn main() {
    // Start the tile server
    let server = Arc::new(Mutex::new(tile_server::TileServer::default().unwrap()));

    // Save the generic font to ./Roboto-Regular.ttf if the file does not exist
    if !path::Path::new("./Roboto-Regular.ttf").exists() {
        std::fs::write("./Roboto-Regular.ttf", GENERIC_FONT).unwrap();
    }
    server.lock().await.new_font(path::PathBuf::from("./Roboto-Regular.ttf")).await;

    println!("Server started at: {}", server.lock().await.address);

    tauri::Builder::default()
        .manage(AppState { server })
        .invoke_handler(tauri::generate_handler![catalog_fonts, catalog_tiles, upload_mbtile, remove_mbtile, get_address])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}