#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use embed_manifest::embed_manifest_file;

fn main() {
	proyecto_monitoreo_bots_lib::run();
	embed_manifest_file("./sample.exe.manifest").expect("unable to embed manifest file");
	println!("cargo:rerun-if-changed=sample.exe.manifest");
	proyecto_monitoreo_bots_lib::run();
}
