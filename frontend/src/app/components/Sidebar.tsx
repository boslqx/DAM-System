"use client";

import { Box, VStack, IconButton, Text, HStack } from "@chakra-ui/react";
import { motion, useAnimation } from "framer-motion";
import { FiHome, FiUpload, FiSettings, FiLogOut } from "react-icons/fi";
import { useState } from "react";

const MotionBox = motion(Box);

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const controls = useAnimation();

  const handleMouseEnter = () => {
    setIsOpen(true);
    controls.start({ width: "200px" });
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
    controls.start({ width: "60px" });
  };

  return (
    <MotionBox
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      animate={controls}
      initial={{ width: "60px" }}
      position="fixed"
      left={0}
      top={0}
      h="100vh"
      bg="brand.200"
      color="white"
      zIndex={20}
      boxShadow="md"
      overflow="hidden"
    >
      <VStack spacing={6} mt={10} align="stretch">
        {/* Logo + Title */}
        <HStack px={4}>
          <Box
            bg="white"
            borderRadius="full"
            boxSize="30px"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="brand.200" fontWeight="bold">
              D
            </Text>
          </Box>
          {isOpen && (
            <Text fontWeight="bold" ml={2}>
              DAM System
            </Text>
          )}
        </HStack>

        {/* Menu Items */}
        <VStack spacing={2} align="stretch" mt={8}>
          {[
            { icon: FiHome, label: "Dashboard" },
            { icon: FiUpload, label: "Uploads" },
            { icon: FiSettings, label: "Settings" },
            { icon: FiLogOut, label: "Logout" },
          ].map(({ icon: Icon, label }) => (
            <HStack
              key={label}
              px={4}
              py={3}
              _hover={{ bg: "brand.300" }}
              cursor="pointer"
              transition="0.2s ease"
            >
              <IconButton
                aria-label={label}
                icon={<Icon />}
                variant="ghost"
                color="white"
                _hover={{ bg: "transparent" }}
              />
              {isOpen && <Text>{label}</Text>}
            </HStack>
          ))}
        </VStack>
      </VStack>
    </MotionBox>
  );
}
