"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Box, Stack, Text, Button } from "@mantine/core";
import { IconCalendar, IconReceipt, IconListDetails, IconScissors, IconUsers, IconUser, IconPackage, IconShoppingCart, IconCash, IconHistory } from "@tabler/icons-react";
import { useAuthStore } from "@/store/authStore";

const adminNavItems = [
  { label: "Servicios", href: "/dashboard/services", icon: IconListDetails },
  { label: "Staff", href: "/dashboard/staff", icon: IconScissors },
  { label: "Usuarios", href: "/dashboard/users", icon: IconUser },
  { label: "Caja", href: "/dashboard/cash-register", icon: IconCash },
  { label: "Historial", href: "/dashboard/cash-history", icon: IconHistory },
];

// Visible to all authenticated users (not protected but accessible)
const allUsersNavItems = [
  { label: "Clientes", href: "/dashboard/clients", icon: IconUsers },
  { label: "Proveedores", href: "/dashboard/suppliers", icon: IconPackage },
  { label: "Pedidos", href: "/dashboard/orders", icon: IconShoppingCart },
];

const baseNavItems = [
  { label: "Turnos", href: "/dashboard", icon: IconCalendar },
  { label: "Tickets", href: "/dashboard/tickets", icon: IconReceipt },
];

interface SidebarProps {
  onNavigate?: () => void;
  isDrawer?: boolean;
}

export function Sidebar({ onNavigate, isDrawer }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  // Only show admin routes to ADMIN users, clients visible to all
  const navItems =
    user?.role === "ADMIN"
      ? [...baseNavItems, ...allUsersNavItems, ...adminNavItems]
      : [...baseNavItems, ...allUsersNavItems];

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    onNavigate?.();
  };

  return (
    <Box
      style={{
        width: isDrawer ? "100%" : 200,
        height: "100%",
        borderRight: isDrawer ? "none" : "1px solid #e0e0e0",
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <Stack gap={0} p="sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Box
              key={item.href}
              variant={isActive ? "filled" : "subtle"}
              onClick={() => handleNavClick(item.href)}
              onMouseEnter={() => setHoveredHref(item.href)}
              onMouseLeave={() => setHoveredHref(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                borderRadius: "4px",
                cursor: "pointer",
                backgroundColor: isActive
                  ? "oklch(71.5% 0.143 215.221 / 0.2)"
                  : hoveredHref === item.href
                  ? "oklch(71.5% 0.143 215.221 / 0.08)"
                  : "transparent",
                color: isActive ? "oklch(71.5% 0.143 215.221)" : "#333",
                transition: "background-color 150ms ease",
              }}
            >
              {item.icon && <item.icon size={18} />}
              <Text size="sm">{item.label}</Text>
            </Box>
          );
        })}
      </Stack>

      <Box
        style={{
          marginTop: "auto",
          padding: '5px 5px 5px 0',
          borderTop: "1px solid #e0e0e0",
          width: 200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {user && (
          <Text size="xs" c="dimmed" mb={8} mt={8}>
            {user.email}
          </Text>
        )}
        <Button
          variant="subtle"
          color="oklch(71.5% 0.143 215.221)"
          size="xs"
          radius="sm"
          style={{
            width: "90%",
          }}
          onClick={handleSignOut}
        >
          Cerrar sesión
        </Button>
        {/* <Button
          variant="subtle"
          size="xs"
          style={{
            color: 'oklch(71.5% 0.143 215.221)',
            fontWeight: 500,
            width: '90%',
          }}
          styles={{
            root: {
              '&:hover': {
                backgroundColor: 'oklch(71.5% 0.143 215.221 / 0.2)',
              },
            },
          }}
          onClick={handleSignOut}
        >
          Cerrar sesión
        </Button> */}
      </Box>
    </Box>
  );
}
