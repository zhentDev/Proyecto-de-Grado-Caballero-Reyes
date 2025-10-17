import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SystemParameters {
  total_memory: number;
  used_memory: number;
  total_disk_space: number;
  available_disk_space: number;
  network_status: string;
}

const SystemInfoBox: React.FC = () => {
  const [params, setParams] = useState<SystemParameters | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystemParams = async () => {
      try {
        const result = await invoke<SystemParameters>("get_system_parameters");
        setParams(result);
      } catch (err) {
        console.error("Error fetching system parameters:", err);
        setError(err as string);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemParams();
    // Optionally, refresh every X seconds
    const interval = setInterval(fetchSystemParams, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-2 text-xs text-gray-400">
        Cargando parámetros del sistema...
      </div>
    );
  }

  if (error) {
    return <div className="p-2 text-xs text-red-400">Error: {error}</div>;
  }

  if (!params) {
    return (
      <div className="p-2 text-xs text-gray-400">
        No hay datos de sistema disponibles.
      </div>
    );
  }

  // Helper to format bytes to GB
  const formatBytesToGB = (bytes: number) => (bytes / 1024 ** 3).toFixed(2);

  return (
    <div className="bg-gray-800 text-gray-200 p-2 text-xs rounded-md mt-4 mx-2">
      <h3 className="font-bold mb-1">Parámetros del Sistema</h3>
      <div className="grid grid-cols-2 gap-1">
        <span>RAM Total:</span>
        <span>{formatBytesToGB(params.total_memory)} GB</span>

        <span>RAM Usada:</span>
        <span>{formatBytesToGB(params.used_memory)} GB</span>

        <span>Disco Total:</span>
        <span>{formatBytesToGB(params.total_disk_space)} GB</span>

        <span>Disco Disp.:</span>
        <span>{formatBytesToGB(params.available_disk_space)} GB</span>

        <span>Internet:</span>
        <span>{params.network_status}</span>
      </div>
    </div>
  );
};

export default SystemInfoBox;
