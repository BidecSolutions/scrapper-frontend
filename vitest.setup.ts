import "@testing-library/jest-dom";
import React from "react";

// Ensure React is available for components compiled with the classic runtime
(globalThis as any).React = React;
