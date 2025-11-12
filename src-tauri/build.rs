fn main() {
	// Llama a la función predeterminada de Tauri
	tauri_build::build();

	// Solución para el error STATUS_ENTRYPOINT_NOT_FOUND
	let target_os = std::env::var("CARGO_CFG_TARGET_OS").unwrap();
	let target_env = std::env::var("CARGO_CFG_TARGET_ENV");
	let is_tauri_workspace = std::env::var("__TAURI_WORKSPACE__").is_ok_and(|v| v == "true");
	if is_tauri_workspace && target_os == "windows" && Ok("msvc") == target_env.as_deref() {
		embed_manifest_for_tests();
	}
}

// Función para incrustar el manifiesto necesario en Windows
fn embed_manifest_for_tests() {
	static WINDOWS_MANIFEST_FILE: &str = "windows-app-manifest.xml";

	// Ajusta esta ruta según donde esté ubicado el archivo windows-app-manifest.xml en tu proyecto
	let manifest = std::env::current_dir()
		.unwrap()
		.join("../src-tauri/src/windows-app-manifest.xml")
		.join(WINDOWS_MANIFEST_FILE); // Cambia "ruta/a/tu/archivo" por la ubicación real

	println!("cargo:rerun-if-changed={}", manifest.display());
	// Incrusta el archivo de manifiesto de la aplicación de Windows
	println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
	println!(
		"cargo:rustc-link-arg=/MANIFESTINPUT:{}",
		manifest.to_str().unwrap()
	);
	// Convierte las advertencias del linker en errores
	println!("cargo:rustc-link-arg=/WX");
}
