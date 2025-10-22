// app/favorites/page.tsx
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
  useToast,
  Badge,
  HStack,
  IconButton,
  Tooltip,
  Button,
} from "@chakra-ui/react";
import { DownloadIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";
import FavoriteButton from "@/components/FavoriteButton";

type Asset = {
  id: number;
  name: string;
  description: string;
  file: string;
  file_type: string;
  file_size: number;
  created_at: string;
  category: string;
  tags: string[];
  is_public: boolean;
  created_by_username: string;
  is_favorited?: boolean;
  favorites_count?: number;
};

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetchFavorites();
  }, [router]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch('http://127.0.0.1:8000/api/assets/favorites/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }

      const data = await response.json();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error loading favorites",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = () => {
    // Refresh the favorites list when an item is unfavorited
    fetchFavorites();
  };

  // Helper functions from your dashboard
  const getFullFileUrl = (fileUrl: string): string => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    return `http://127.0.0.1:8000${fileUrl}`;
  };

  const getPreviewType = (asset: Asset): string => {
    const extension = asset.name.split('.').pop()?.toLowerCase() || '';
    if (asset.file_type === 'IMG') return 'image';
    if (asset.file_type === 'VID') return 'video';
    if (asset.file_type === '3D') return '3d';
    if (asset.file_type === 'DOC') {
      return extension === 'pdf' ? 'pdf' : 'document';
    }

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
    if (['pdf'].includes(extension)) return 'pdf';
    if (['glb', 'gltf', 'obj', 'fbx'].includes(extension)) return '3d';
    if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(extension)) return 'document';

    return 'other';
  };

  if (loading) {
    return (
      <Flex>
        <Sidebar />
        <Box flex="1" p={8} bg="brand.50" minH="100vh" ml={{ base: "0", md: "60px" }}>
          <Flex justify="center" align="center" minH="50vh">
            <Spinner size="xl" color="brand.200" />
          </Flex>
        </Box>
      </Flex>
    );
  }

  return (
    <Flex>
      <Sidebar />
      <Box flex="1" p={8} bg="brand.50" minH="100vh" ml={{ base: "0", md: "60px" }}>
        {/* Header */}
        <HStack mb={6} spacing={4}>
          <Button
            leftIcon={<ChevronLeftIcon />}
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            colorScheme="blue"
          >
            Back to Dashboard
          </Button>
          <VStack align="start" spacing={1}>
            <Heading color="gray.700">My Favorites</Heading>
            <Text color="gray.600" fontSize="sm">
              {favorites.length} {favorites.length === 1 ? 'favorite asset' : 'favorite assets'}
            </Text>
          </VStack>
        </HStack>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <Flex
            justify="center"
            align="center"
            direction="column"
            py={20}
            bg="white"
            borderRadius="xl"
            boxShadow="sm"
            textAlign="center"
          >
            <Text fontSize="6xl" mb={4} color="yellow.400">⭐</Text>
            <Text fontSize="xl" color="gray.600" mb={2} fontWeight="medium">
              No favorites yet
            </Text>
            <Text color="gray.500" mb={6} maxW="md">
              Assets you mark as favorites will appear here. Start by exploring the dashboard and clicking the star icon on assets you like!
            </Text>
            <Button
              colorScheme="yellow"
              onClick={() => router.push("/dashboard")}
              size="lg"
            >
              Explore Assets
            </Button>
          </Flex>
        ) : (
          <Grid templateColumns="repeat(auto-fill, minmax(280px, 1fr))" gap={6}>
            {favorites.map((asset) => {
              const displayType = getPreviewType(asset);
              return (
                <GridItem
                  key={asset.id}
                  bg="white"
                  borderRadius="xl"
                  p={4}
                  boxShadow="sm"
                  border="1px solid"
                  borderColor="gray.200"
                  _hover={{ boxShadow: "md", transform: "translateY(-4px)" }}
                  transition="0.2s ease"
                  cursor="pointer"
                >
                  <VStack align="start" spacing={3}>
                    {/* Preview with Favorite Button */}
                    {displayType === "image" && (
                      <Box position="relative" w="100%" h="150px">
                        <Image
                          src={getFullFileUrl(asset.file)}
                          alt={asset.name}
                          borderRadius="md"
                          w="100%"
                          h="100%"
                          objectFit="cover"
                          fallback={
                            <Box w="100%" h="100%" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                              <Text color="gray.500">Image not loading</Text>
                            </Box>
                          }
                        />
                        <FavoriteButton
                          assetId={asset.id}
                          isFavorited={asset.is_favorited}
                          onToggle={handleFavoriteToggle}
                          position="absolute"
                        />
                      </Box>
                    )}

                    {/* Add similar preview blocks for other file types */}
                    {displayType !== "image" && (
                      <Box position="relative" w="100%" h="150px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
                        <Text color="gray.600" fontWeight="medium">
                          {displayType.toUpperCase()} File
                        </Text>
                        <FavoriteButton
                          assetId={asset.id}
                          isFavorited={asset.is_favorited}
                          onToggle={handleFavoriteToggle}
                          position="absolute"
                        />
                      </Box>
                    )}

                    {/* Asset Info */}
                    <Box w="100%">
                      <Text fontWeight="bold" noOfLines={1}>{asset.name}</Text>
                      <Text fontSize="sm" color="gray.600" noOfLines={2}>
                        {asset.description || "No description"}
                      </Text>

                      {/* Tags */}
                      {asset.tags && asset.tags.length > 0 && (
                        <Flex wrap="wrap" gap={1} mt={2}>
                          {asset.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} colorScheme="blue" variant="subtle" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </Flex>
                      )}

                      <Text fontSize="xs" color="gray.500" mt={2}>
                        Type: {asset.file_type} • {(asset.file_size / 1024 / 1024).toFixed(1)}MB
                      </Text>
                    </Box>

                    {/* Action Buttons */}
                    <Flex justify="space-between" w="100%" pt={2}>
                      <HStack>
                        <Tooltip label="Download asset">
                          <IconButton
                            aria-label="Download asset"
                            icon={<DownloadIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="blue"
                            as="a"
                            href={getFullFileUrl(asset.file)}
                            download
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      </HStack>

                      <Badge colorScheme={asset.is_public ? "green" : "orange"}>
                        {asset.is_public ? "Public" : "Private"}
                      </Badge>
                    </Flex>
                  </VStack>
                </GridItem>
              );
            })}
          </Grid>
        )}
      </Box>
    </Flex>
  );
}