// src/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  console.error(`Error in ${req.apiName}:`, err.message);

  if (err.response) {
    console.error(`Error status code: ${err.response.status}`);
    res.status(err.response.status).json({
      error: err.response.data,
    });
  } else if (err.request) {
    console.error("No response received:", err.request);
    res.status(500).json({
      error: "No response received from the server",
    });
  } else {
    console.error("Error:", err.message);
    res.status(500).json({
      error: err.message,
    });
  }
}
