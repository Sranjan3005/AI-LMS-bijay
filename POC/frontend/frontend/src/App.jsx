import React, { useState } from 'react';

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select an image to process.");
      return;
    }

    setLoading(true);
    setResult(null);

    // Use FormData to send file + text together
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:8000/ai-build", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
        setResult(data);
      } catch (error) {
        setResult({ error: "Failed to connect to backend" });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ padding: "40px", fontFamily: "sans-serif", maxWidth: "800px", margin: "auto" }}>
        <h1>Dynamic AI Image Processor</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "30px" }}>

          <input
            type="file"
            accept="image/*, .csv"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            required
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., Find people and draw boxes..."
              style={{ flex: 1, padding: "10px", fontSize: "16px" }}
              required
            />
            <button type="submit" disabled={loading} style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}>
              {loading ? "Processing..." : "Run AI"}
            </button>
          </div>
        </form>

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Display Processed Image */}
            {result.image_base64 && (
              <div style={{ background: "#f0f8ff", padding: "15px", borderRadius: "5px", textAlign: "center" }}>
                <h3>Processed Image</h3>
                <img
                  src={`data:image/*;base64,${result.image_base64}`}
                  alt="Processed Output"
                  style={{ maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                />
              </div>
            )}

            {/* Logs and Code */}
            <div style={{ background: "#f4f4f4", padding: "15px", borderRadius: "5px" }}>
              <h3>Generated Python Code</h3>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, overflowX: "auto" }}>{result.generated_code}</pre>
            </div>

            <div style={{ background: "#e8f5e9", padding: "15px", borderRadius: "5px" }}>
              <h3>Console Output</h3>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, overflowX: "auto" }}>{result.output}</pre>
            </div>

            {result.error && (
              <div style={{ background: "#ffebee", padding: "15px", borderRadius: "5px" }}>
                <h3>Execution Errors</h3>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "red", overflowX: "auto" }}>{result.error}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }