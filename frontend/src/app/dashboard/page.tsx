"use client";

import { useEffect, useState, useCallback } from "react";
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
  useToast,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";

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
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  // Fetch assets from Django API
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/assets/")
      .then((res) => res.json())
      .then((data) => {
        setAssets(data);
        setLoading(false);
      });
  }, []);

  // File upload handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("name", file.name);
    formData.append("file", file);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png"].includes(ext!)) formData.append("type", "image");
    else if (["mp4"].includes(ext!)) formData.append("type", "video");
    else if (["glb"].includes(ext!)) formData.append("type", "model");
    else {
      toast({ title: "Unsupported file type", status: "error" });
      setUploading(false);
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/api/assets/", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const newAsset = await res.json();
      setAssets((prev) => [newAsset, ...prev]);
      toast({ title: "Upload successful!", status: "success" });
    } else {
      toast({ title: "Upload failed!", status: "error" });
    }
    setUploading(false);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "video/mp4": [".mp4"],
      "model/gltf-binary": [".glb"],
    },
  });

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

      {/* 🔹 Drag & Drop Upload Zone */}
      <Box
        {...getRootProps()}
        border="2px dashed"
        borderColor={isDragActive ? "brand.300" : "brand.200"}
        bg={isDragActive ? "brand.100" : "white"}
        borderRadius="xl"
        p={10}
        textAlign="center"
        mb={8}
        cursor="pointer"
        transition="0.2s ease"
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Spinner size="lg" color="brand.200" />
        ) : isDragActive ? (
          <Text color="brand.300" fontWeight="bold">
            Drop your file here...
          </Text>
        ) : (
          <>
            <Text fontSize="lg" color="brand.200">
              Drag & Drop or Click to Upload
            </Text>
            <Text fontSize="sm" color="gray.600">
              Supported: .jpg, .png, .mp4, .glb
            </Text>
          </>
        )}
      </Box>

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
