param([string]$guid, [int]$port)
Write-Host "Dummy bot for OpenProject_Medium with GUID: $guid. Simulating project opening..."
# In a real scenario, this script would interact with the Tauri app
# to trigger the "open project" action.
# The Tauri app would then call `emit_ack_tcp` when the project is fully loaded.
# For demonstration, we just exit.
exit 0