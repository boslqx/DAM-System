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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

type Asset = {
  id: number;
  name: string;
  description: string;
  file: string;
  type: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 🔹 Check login & role from localStorage
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (!token || !storedRole) {
      router.push("/login");
    } else {
      setRole(storedRole);
    }
  }, [router]);

  // 🔹 Fetch assets
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login"); // redirect if not logged in
      return;
    }

    fetch("http://127.0.0.1:8000/api/assets/", {
      headers: {
        Authorization: `Token ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAssets(data);
        } else if (data.results && Array.isArray(data.results)) {
          setAssets(data.results);
        } else {
          setAssets([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching assets:", err);
        setAssets([]);
        setLoading(false);
      });
  }, []);

  // 🔹 File upload handler
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (role !== "Admin" && role !== "Editor") {
        toast({ title: "Access denied", status: "error" });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setUploading(true);

      const formData = new FormData();
      formData.append("name", file.name);
      formData.append("file", file);

      const ext = file.name.split(".").pop()?.toLowerCase();
      let detectedType = "other";
      if (["jpg", "jpeg", "png", "gif"].includes(ext!)) detectedType = "image";
      else if (["mp4", "mov", "avi"].includes(ext!)) detectedType = "video";
      else if (["pdf", "docx", "pptx", "xlsx"].includes(ext!)) detectedType = "document";
      else if (["glb", "gltf"].includes(ext!)) detectedType = "model";

      formData.append("type", detectedType);

      const res = await fetch("http://127.0.0.1:8000/api/assets/", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Token ${localStorage.getItem("token")}`,
        },
      });

      if (res.ok) {
        const newAsset = await res.json();
        setAssets((prev) => [newAsset, ...prev]);
        toast({ title: "Upload successful!", status: "success" });
      } else {
        toast({ title: "Upload failed!", status: "error" });
      }
      setUploading(false);
    },
    [role, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "*/*": [] },
  });

  const handlePreview = (asset: Asset) => {
    setSelectedAsset(asset);
    onOpen();
  };

  if (!role) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="brand.200" />
      </Flex>
    );
  }

  return (
    <Flex>
      <Sidebar />

      <Box flex="1" p={8} bg="brand.50" minH="100vh" ml={{ base: "0", md: "60px" }} transition="margin 0.3s ease">
        <Heading mb={6} textAlign="center" color="brand.200">
          Asset Dashboard
        </Heading>

        {/* 🔹 Editor & Admin upload */}
        {(role === "Admin" || role === "Editor") && (
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
                  Supported: Any file type (images, videos, PDFs, documents, 3D models, etc.)
                </Text>
              </>
            )}
          </Box>
        )}

        {/* 🔹 Asset Grid (all roles) */}
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
              onClick={() => handlePreview(asset)}
              cursor="pointer"
            >
              <VStack align="start" spacing={3}>
                {asset.type === "image" && <Image src={asset.file} alt={asset.name} borderRadius="md" w="100%" h="150px" objectFit="cover" />}
                {asset.type === "video" && (
                  <video width="100%" height="150">
                    <source src={asset.file} />
                  </video>
                )}
                {asset.type === "document" && (
                  <Box w="100%" h="150px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                    <Text fontWeight="bold" color="brand.200">
                      📄 {asset.name}
                    </Text>
                  </Box>
                )}
                {asset.type === "other" && (
                  <Box w="100%" h="150px" bg="gray.50" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                    <Text color="gray.600">🗂️ {asset.name}</Text>
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

        {/* 🔹 Preview Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>{selectedAsset?.name}</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6} display="flex" justifyContent="center" alignItems="center">
              {selectedAsset?.type === "image" && <Image src={selectedAsset.file} alt={selectedAsset.name} borderRadius="md" maxH="70vh" objectFit="contain" />}
              {selectedAsset?.type === "video" && (
                <video width="100%" height="auto" controls>
                  <source src={selectedAsset.file} />
                </video>
              )}
              {selectedAsset?.type === "document" && (
                <Box w="100%" h="600px">
                  <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                    <Viewer fileUrl={`http://127.0.0.1:8000${new URL(selectedAsset.file).pathname}`} />
                  </Worker>
                </Box>
              )}
              {selectedAsset?.type === "other" && (
                <Box textAlign="center" p={4}>
                  <Text mb={4}>Preview not available</Text>
                  <Button as="a" href={selectedAsset.file} download colorScheme="blue">
                    Download File
                  </Button>
                </Box>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </Flex>
  );
}
