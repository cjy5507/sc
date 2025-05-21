const handleStop = async () => {
  try {
    const result = await window.electronAPI.stopAutomation({ stores: selectedStores });
    if (result.success) {
      setRunningStores([]);
      window.electronAPI.closeMainWindow();
    }
  } catch (error) {
    console.error('Failed to stop automation:', error);
  }
}; 