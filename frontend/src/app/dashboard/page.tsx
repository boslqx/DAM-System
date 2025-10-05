"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Grid,
  GridItem,
  Image,
  Text,
  VStack,
  Heading,
  Spinner,
  Flex,
  Button,
  Input,
} from "@chakra-ui/react";

type Asset = {
  id: number;
  name: string;
  description: string;
  file: string;
  type: string;
};

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/assets/")
      .then((res) => res.json())
      .then((data) => {
        setAssets(data);
        setLoading(false);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files ? e.target.files[0] : null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append("name", selectedFile.name);
    formData.append("file", selectedFile);

    const fileType = selectedFile.name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png"].includes(fileType!)) formData.append("type", "image");
    else if (["mp4"].includes(fileType!)) formData.append("type", "video");
    else if (["glb"].includes(fileType!)) formData.append("type", "model");
    else return alert("Unsupported file type");

    const res = await fetch("http://127.0.0.1:8000/api/assets/", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("Upload successful!");
      const newAsset = await res.json();
      setAssets((prev) => [newAsset, ...prev]);
      setSelectedFile(null);
    } else {
      alert("Upload failed!");
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="brand.200" />
      </Flex>
    );
  }

  return (
    <Box p={8} bg="brand.50" minH="100vh">
      <Heading mb={6} textAlign="center" color="brand.200">
        Asset Dashboard
      </Heading>

      {/* 🔹 Upload Section */}
      <Flex
        mb={8}
        align="center"
        justify="center"
        direction="column"
        bg="brand.100"
        p={6}
        borderRadius="xl"
        boxShadow="sm"
      >
        <Input
          type="file"
          onChange={handleFileChange}
          mb={4}
          bg="white"
          p={2}
        />
        <Button
          onClick={handleUpload}
          bg="brand.200"
          color="white"
          _hover={{ bg: "brand.300" }}
        >
          Upload File
        </Button>
      </Flex>

      {/* 🔹 Asset Grid */}
      <Grid templateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={6}>
        {assets.map((asset) => (
          <GridItem
            key={asset.id}
            bg="brand.100"
            borderRadius="xl"
            p={4}
            boxShadow="sm"
            _hover={{ boxShadow: "md", transform: "translateY(-4px)" }}
            transition="0.2s ease"
          >
            <VStack align="start" spacing={3}>
              {asset.type === "image" && (
                <Image
                  src={asset.file}
                  alt={asset.name}
                  borderRadius="md"
                  w="100%"
                  h="150px"
                  objectFit="cover"
                />
              )}
              {asset.type === "video" && (
                <video width="100%" height="150" controls>
                  <source src={asset.file} type="video/mp4" />
                </video>
              )}
              {asset.type === "model" && (
                <Box
                  w="100%"
                  h="150px"
                  bg="brand.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontWeight="bold"
                >
                  3D Model Preview (Coming Soon)
                </Box>
              )}
              <Text fontWeight="bold">{asset.name}</Text>
              <Text fontSize="sm" color="gray.600">
                {asset.description || "No description"}
              </Text>
            </VStack>
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
}
