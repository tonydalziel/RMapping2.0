use std::{path::PathBuf};

pub struct TileServer {
    pub server_handle: actix_server::ServerHandle,
    pub state: martin::ServerState,
    pub address: String,
    pub tile_layers: Vec<Vec<Box<dyn martin::Source>>>,
    pub font_layers: Vec<PathBuf>,
}

unsafe impl Sync for TileServer {}

impl TileServer {
    // Check if the server is running
    async fn stop_server(&self) {
        self.server_handle.stop(true).await;
    }

    // Add a new mbtiles file to the tile server
    pub async fn new_mbtiles(&mut self, file_path: PathBuf) -> Result<String, String> {
        // Stop the server
        self.stop_server().await;

        // Load the new mbtiles file
        let mut config: martin::file_config::FileConfigEnum<martin::mbtiles::MbtConfig> = martin::file_config::FileConfigEnum::new(
            vec![file_path]
        );

        // Resolve the file
        let resolver = martin::IdResolver::default();

        let mbtiles_file = martin::file_config::resolve_files(
            &mut config,
            &resolver,
            None,
            "mbtiles",
        ).await;

        // Unwrap the result and return an error message if it fails
        match mbtiles_file {
            Ok(mbtiles_file) => {
                // Add the mbtiles file to the tile source of the current state
                self.tile_layers = [self.tile_layers.clone(), vec![mbtiles_file]].concat();

                return self.update_state().and_then(|_| {
                    Ok(format!("MBTiles file added successfully"))
                });
            },
            Err(e) => {
                return Err(format!("Error: {:?}", e));
            }
        }
    }

    pub async fn remove_tile(&mut self, tile_name: String) -> Result<String, String> {
        // Stop the server
        self.stop_server().await;

        // Remove the tile from the tile server
        self.tile_layers.retain(|layer| {
            match layer.get(0) {
                Some(tile) => {
                    if tile.get_id() == tile_name {
                        return false;
                    }
                },
                None => {
                    return false;
                }
            }

            return true;
        });

        // Unwrap the result and return an error message if it fails
        match self.update_state(){
            Ok(_) => {
                return Ok(format!("Tile removed successfully"));
            },
            Err(e) => {
                return Err(format!("Error: {:?}", e));
            }
        }
    }

    // Add a new font file to the tile server
    pub async fn new_font(&mut self, file_path: PathBuf) -> String {
        // Stop the server
        self.stop_server().await;

        // Load the new font file
        self.font_layers.push(file_path);

        // Unwrap the result and return an error message if it fails
        match self.update_state(){
            Ok(_) => {
                return format!("Font file added successfully");
            },
            Err(e) => {
                return format!("Error: {:?}", e);
            }
        }
    }

    

    // Function to return the names of all existing tile layers using the current state
    pub fn get_tile_layers_names(&self) -> Vec<String> {
        let mut layers: Vec<String> = Vec::new();

        self.state.tiles.get_catalog().iter().for_each(|(key, _)| {
            layers.push(key.clone());
        });

        return layers;
    }

    // Function to return the names of all existing font layers using the current state
    pub fn get_font_layers_names(&self) -> Vec<String> {
        let mut layers: Vec<String> = Vec::new();

        self.state.fonts.get_catalog().iter().for_each(|(key, _)| {
            layers.push(key.clone());
        });

        return layers;
    }

    // Function to update the current state and server using the current layers
    fn update_state(&mut self) -> Result<(), String>{

        let font_sources = martin::fonts::FontSources::resolve(&mut martin::OptOneMany::Many(self.font_layers.clone()));

        match font_sources {
            Ok(font_sources) => {
                self.state = martin::ServerState {
                    cache: None,
                    tiles: martin::TileSources::new(self.tile_layers.clone()),
                    sprites: martin::sprites::SpriteSources::default(),
                    fonts: font_sources.clone(),
                };

                let state = martin::ServerState {
                    cache: None,
                    tiles: martin::TileSources::new(self.tile_layers.clone()),
                    sprites: martin::sprites::SpriteSources::default(),
                    fonts: font_sources,
                };

                match martin::srv::new_server(
                    server_config(),
                    state
                ){
                    Ok(app) => {
                        self.server_handle = app.0.handle();

                        // Start a new thread which waits for the server to finish
                        tokio::spawn(app.0);

                        self.address = app.1;

                        println!("New server started at: {}", self.address);
                        return Ok(());
                    },
                    Err(e) => {
                        return Err(format!("Error: {:?}", e));
                    }
                }
            },
            Err(e) => {
                return Err(format!("Error: {:?}", e));
            }
        }
    }

    // Function to initialise the server with default values
    pub fn default() -> Result<Self, String> {
        let state = martin::ServerState {
            cache: None,
            tiles: martin::TileSources::default(),
            sprites: martin::sprites::SpriteSources::default(),
            fonts: martin::fonts::FontSources::default(),
        };

        let app = martin::srv::new_server(
            server_config(),
            state
        );
    
        // Print the string from the result
        match app {
            Ok(app) => {

                let handle = app.0.handle();

                // Start a new thread which waits for the server to finish
                tokio::spawn(app.0);

                return Ok(TileServer {
                    server_handle: handle,
                    state: martin::ServerState {
                        cache: None,
                        tiles: martin::TileSources::default(),
                        sprites: martin::sprites::SpriteSources::default(),
                        fonts: martin::fonts::FontSources::default(),
                    },
                    address: app.1,
                    tile_layers: Vec::new(),
                    font_layers: Vec::new(),
                });
            },
            Err(e) => {
                return Err(format!("Error: {:?}", e));
            }
        }
    }
}

fn server_config() -> martin::srv::SrvConfig {
    let mut server_config = martin::srv::SrvConfig::default();

    // Continually randomly select port numbers and check locally if they are available
    match port_scanner::request_open_port(){
        Some(port) => {
            server_config.listen_addresses = Some(format!("0.0.0.0:{}", port));
        },
        None => {
            println!("Error: No port available");
        }
    }

    return server_config;
}