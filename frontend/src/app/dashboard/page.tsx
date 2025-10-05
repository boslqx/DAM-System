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

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/assets/")
      .then((res) => res.json())
      .then((data) => {
        setAssets(data);
        setLoading(false);
      });
  }, []);

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
