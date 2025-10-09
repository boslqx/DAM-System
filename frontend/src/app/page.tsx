"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

type HomeAsset = { id: number; name: string; description?: string; file: string };

export default function Home() {
  const [assets, setAssets] = useState<HomeAsset[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/assets/"))
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
