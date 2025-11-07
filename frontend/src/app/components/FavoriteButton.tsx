// components/FavoriteButton.tsx
"use client";

import { useState } from "react";
import { IconButton, Tooltip, useToast } from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";

interface FavoriteButtonProps {
  assetId: number;
  isFavorited?: boolean;
  onToggle: () => void;
  size?: "sm" | "md" | "lg";
  position?: "absolute" | "relative";
  top?: string;
  right?: string;
}

const FavoriteButton = ({
  assetId,
  isFavorited = false,
  onToggle,
  size = "md",
  position = "absolute",
  top = "2",
  right = "2"
}: FavoriteButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const handleToggleFavorite = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      const action = isFavorited ? 'unfavorite' : 'favorite';

      const response = await fetch(`http://127.0.0.1:8000/api/assets/${assetId}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Call parent's onToggle to refresh the data
        onToggle();

        toast({
          title: isFavorited ? "Removed from favorites" : "Added to favorites",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to toggle favorite');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Failed to update favorites",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip
      label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      placement="top"
    >
      <IconButton
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
        icon={
          <StarIcon
            color={isFavorited ? "yellow.400" : "white"}
            fill={isFavorited ? "yellow.400" : "none"}
            stroke={isFavorited ? "yellow.400" : "white"}
            strokeWidth="2px"
          />
        }
        size={size}
        variant="ghost"
        colorScheme="yellow"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleFavorite();
        }}
        isLoading={isLoading}
        position={position}
        top={top}
        right={right}
        bg="rgba(0, 0, 0, 0.4)"
        _hover={{
          bg: "rgba(0, 0, 0, 0.6)",
          transform: "scale(1.1)",
        }}
        transition="all 0.2s"
        zIndex="10"
      />

    </Tooltip>
  );
};

export default FavoriteButton;