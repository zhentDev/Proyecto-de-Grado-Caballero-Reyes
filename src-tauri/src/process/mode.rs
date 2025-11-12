use std::sync::Mutex;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AppMode {
    None,
    Emitter,
    Receiver,
}

pub struct AppModeState(pub Mutex<AppMode>);

impl Default for AppModeState {
    fn default() -> Self {
        AppModeState(Mutex::new(AppMode::None))
    }
}
