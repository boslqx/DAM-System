"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [assets, setAssets] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/assets/")
      .then((res) => res.json())
      .then((data) => setAssets(data));
  }, []);

  return (
    <div>
      <h1>Assets</h1>
      <ul>
        {assets.map((asset) => (
          <li key={asset.id}>
            <strong>{asset.name}</strong> – {asset.description}
            <br />
            <a href={asset.file} target="_blank" rel="noreferrer">
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
