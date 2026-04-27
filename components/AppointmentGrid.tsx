"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Group,
  Button,
  Text,
  Modal,
  NativeSelect,
  Textarea,
  Stack,
  Badge,
  ActionIcon,
  TextInput,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import es from "dayjs/locale/es";
import {
  IconPlus,
  IconGripVertical,
  IconClock,
  IconCalendarOff,
  IconTrash,
} from "@tabler/icons-react";
import {
  useAppointmentStore,
  Appointment,
  Staff,
  BlockedSlot,
} from "@/store/appointmentStore";
import { useAuthStore } from "@/store/authStore";
import { toArgentinaDate, parseLocalTime } from "@/store/dateUtils";
import { database } from "@/lib/insforge";

dayjs.locale(es);

// Helper to apply 50% opacity to a hex color
function withOpacity(color: string, opacity: number = 0.5): string {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const TIME_SLOTS = [
  "09:00",
  "09:15",
  "09:30",
  "09:45",
  "10:00",
  "10:15",
  "10:30",
  "10:45",
  "11:00",
  "11:15",
  "11:30",
  "11:45",
  "12:00",
  "12:15",
  "12:30",
  "12:45",
  "13:00",
  "13:15",
  "13:30",
  "13:45",
  "14:00",
  "14:15",
  "14:30",
  "14:45",
  "15:00",
  "15:15",
  "15:30",
  "15:45",
  "16:00",
  "16:15",
  "16:30",
  "16:45",
  "17:00",
  "17:15",
  "17:30",
  "17:45",
  "18:00",
  "18:15",
  "18:30",
  "18:45",
  "19:00",
  "19:15",
  "19:30",
  "19:45",
  "20:00",
  "20:15",
  "20:30",
  "20:45",
];

interface AppointmentBlockProps {
  appointment: Appointment;
  onDragStart: (e: React.DragEvent, id: string, sourceStaffId?: string) => void;
  onTouchDragStart: (
    id: string,
    sourceStaffId: string | undefined,
    startX: number,
    startY: number,
  ) => void;
  onTouchDragMove: (clientX: number, clientY: number) => void;
  onTouchDragEnd: (clientX: number, clientY: number) => void;
  onClick: (appointment: Appointment) => void;
  onResizeStart: (
    edge: "top" | "bottom",
    id: string,
    startTime: string,
    endTime: string,
    e: React.PointerEvent,
  ) => void;
  onResizeMove: (id: string, clientY: number) => void;
  onResizeEnd: () => void;
  isResizing: boolean;
  isTouchDragging: boolean;
}

function AppointmentBlock({
  appointment,
  onDragStart,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  onClick,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  isResizing,
  isTouchDragging,
}: AppointmentBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [pointerDownOnResizeHandle, setPointerDownOnResizeHandle] =
    useState(false);
  const hasMovementRef = useRef(false);
  const service = appointment.services;
  const color = service?.color || "#1971c2";

  const startTime = toArgentinaDate(appointment.start_time);
  const endTime = toArgentinaDate(appointment.end_time);
  const startHour = startTime.hour();
  const startMinute = startTime.minute();
  const durationMinutes = endTime.diff(startTime, "minute");

  const heightPercent = (durationMinutes / 720) * 100;

  const topPercent = (((startHour - 9) * 60 + startMinute) / 720) * 100;

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData("appointmentId", appointment.id);
    e.dataTransfer.setData("sourceStaffId", appointment.staff_id || "");
    onDragStart(e, appointment.id, appointment.staff_id || undefined);
  };

  const handleDragStartIcon = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    e.dataTransfer.setData("appointmentId", appointment.id);
    e.dataTransfer.setData("sourceStaffId", appointment.staff_id || "");
    onDragStart(e, appointment.id, appointment.staff_id || undefined);
  };

  const handleBoxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Block click if pointer was pressed on resize handle
    if (pointerDownOnResizeHandle) return;
    onClick(appointment);
  };

  return (
    <Box
      draggable
      onClick={handleBoxClick}
      onDragStart={handleDragStart}
      onDragEnd={() => setIsDragging(false)}
      onTouchStart={(e: React.TouchEvent) => {
        hasMovementRef.current = false;
        const touch = e.touches[0];
        setIsDragging(true);
        onTouchDragStart(
          appointment.id,
          appointment.staff_id || undefined,
          touch.clientX,
          touch.clientY,
        );
      }}
      onTouchMove={(e: React.TouchEvent) => {
        e.preventDefault();
        hasMovementRef.current = true;
        const touch = e.touches[0];
        onTouchDragMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={(e: React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.changedTouches[0];
        onTouchDragEnd(touch.clientX, touch.clientY);
        setIsDragging(false);
        // If it was a tap (not a drag), open the edit modal
        if (!hasMovementRef.current) {
          onClick(appointment);
        }
      }}
      style={{
        position: "absolute",
        top: `${topPercent}%`,
        left: 0,
        right: 0,
        height: `${Math.max(heightPercent, 4)}%`,
        backgroundColor: withOpacity(color),
        borderRadius: 4,
        padding: 4,
        opacity: isDragging || isTouchDragging ? 0.5 : 1,
        cursor: "grab",
        color: "#fff",
        fontSize: 10,
        overflow: "visible",
        minHeight: 24,
        boxShadow: isResizing
          ? "0 0 8px rgba(0,0,0,0.4)"
          : "0 1px 3px rgba(0,0,0,0.2)",
        zIndex: isResizing ? 10 : 1,
        touchAction: "none",
      }}
    >
      {/* Top resize handle */}
      <Box
        style={{
          position: "absolute",
          top: -4,
          left: "10%",
          right: "10%",
          height: 8,
          backgroundColor: "rgba(255,255,255,0.6)",
          borderRadius: 4,
          cursor: "n-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          touchAction: "none",
        }}
        onPointerDown={(e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setPointerDownOnResizeHandle(true);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onResizeStart(
            "top",
            appointment.id,
            appointment.start_time,
            appointment.end_time,
            e,
          );
        }}
        onPointerMove={(e: React.PointerEvent) => {
          if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
            onResizeMove(appointment.id, e.clientY);
          }
        }}
        onPointerUp={(e: React.PointerEvent) => {
          setTimeout(() => setPointerDownOnResizeHandle(false), 50);
          if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            onResizeEnd();
          }
        }}
        onTouchStart={(e: React.TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setPointerDownOnResizeHandle(true);
          const touch = e.touches[0];
          onResizeStart(
            "top",
            appointment.id,
            appointment.start_time,
            appointment.end_time,
            touch as unknown as React.PointerEvent,
          );
        }}
        onTouchMove={(e: React.TouchEvent) => {
          e.preventDefault();
          const touch = e.touches[0];
          onResizeMove(appointment.id, touch.clientY);
        }}
        onTouchEnd={(e: React.TouchEvent) => {
          setTimeout(() => setPointerDownOnResizeHandle(false), 50);
          onResizeEnd();
        }}
      >
        <Box
          style={{
            width: 30,
            height: 3,
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 2,
          }}
        />
      </Box>

      {/* Drag handle icon */}
      <Box
        style={{
          position: "absolute",
          right: 4,
          top: 2,
          cursor: "grab",
          zIndex: 2,
        }}
        onDragStart={handleDragStartIcon}
      >
        <IconGripVertical size={14} style={{ opacity: 0.8 }} />
      </Box>
      <Text fw={600} size="xs" lineClamp={1}>
        {appointment.clients?.name || "Sin cliente"}
      </Text>
      <Text size="xs" lineClamp={1}>
        {service?.name} ({startTime.format("HH:mm")} - {endTime.format("HH:mm")}
        )
      </Text>

      {/* Bottom resize handle */}
      <Box
        style={{
          position: "absolute",
          bottom: -4,
          left: "10%",
          right: "10%",
          height: 8,
          backgroundColor: "rgba(255,255,255,0.6)",
          borderRadius: 4,
          cursor: "s-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          touchAction: "none",
        }}
        onPointerDown={(e: React.PointerEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setPointerDownOnResizeHandle(true);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          onResizeStart(
            "bottom",
            appointment.id,
            appointment.start_time,
            appointment.end_time,
            e,
          );
        }}
        onPointerMove={(e: React.PointerEvent) => {
          if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
            onResizeMove(appointment.id, e.clientY);
          }
        }}
        onPointerUp={(e: React.PointerEvent) => {
          setTimeout(() => setPointerDownOnResizeHandle(false), 50);
          if ((e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
            (e.target as HTMLElement).releasePointerCapture(e.pointerId);
            onResizeEnd();
          }
        }}
        onTouchStart={(e: React.TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setPointerDownOnResizeHandle(true);
          const touch = e.touches[0];
          onResizeStart(
            "bottom",
            appointment.id,
            appointment.start_time,
            appointment.end_time,
            touch as unknown as React.PointerEvent,
          );
        }}
        onTouchMove={(e: React.TouchEvent) => {
          e.preventDefault();
          const touch = e.touches[0];
          onResizeMove(appointment.id, touch.clientY);
        }}
        onTouchEnd={(e: React.TouchEvent) => {
          setTimeout(() => setPointerDownOnResizeHandle(false), 50);
          onResizeEnd();
        }}
      >
        <Box
          style={{
            width: 30,
            height: 3,
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 2,
          }}
        />
      </Box>
    </Box>
  );
}

interface GridCellProps {
  staff: Staff;
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  selectedDate: Date;
  onDrop?: (e: React.DragEvent, staffId: string, timeSlot: string) => void;
  onTouchDrop: (
    appointmentId: string,
    staffId: string,
    timeSlot: string,
  ) => void;
  onDragStart: (e: React.DragEvent, id: string, sourceStaffId?: string) => void;
  onTouchDragStart: (
    id: string,
    sourceStaffId: string | undefined,
    startX: number,
    startY: number,
  ) => void;
  onTouchDragMove: (clientX: number, clientY: number) => void;
  onTouchDragEnd: (clientX: number, clientY: number) => void;
  touchDragging: boolean;
  onCellClick: (staffId: string, timeSlot: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onBlockSlot: (staffId: string, timeSlot: string, duration: number) => void;
  onResizeBlockedSlot: (id: string, startTime: string, endTime: string) => void;
  onDeleteBlockedSlot: (id: string) => void;
  dragTargetTime: string | null;
  setDragTargetTime: (time: string | null) => void;
  onResizeStart: (
    edge: "top" | "bottom",
    id: string,
    startTime: string,
    endTime: string,
    e: React.PointerEvent,
  ) => void;
  onResizeMove: (id: string, clientY: number) => void;
  onResizeEnd: () => void;
  isResizing: boolean;
}

function GridCell({
  staff,
  appointments,
  blockedSlots,
  selectedDate,
  onDrop,
  onTouchDrop,
  onDragStart,
  onTouchDragStart,
  onTouchDragMove,
  onTouchDragEnd,
  touchDragging,
  onCellClick,
  onAppointmentClick,
  onBlockSlot,
  onResizeBlockedSlot,
  onDeleteBlockedSlot,
  dragTargetTime,
  setDragTargetTime,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
  isResizing,
}: GridCellProps) {
  const [isOver, setIsOver] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
    time: string;
  } | null>(null);
  const [resizingBlockedSlot, setResizingBlockedSlot] = useState<{
    id: string;
    edge: "top" | "bottom";
    startY: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);
  const [dragTargetForDrop, setDragTargetForDrop] = useState<string | null>(
    null,
  );

  const cellAppointments = appointments.filter(
    (apt) => apt.staff_id === staff.id,
  );

  // Get blocked slots for this staff
  const staffBlockedSlots = blockedSlots.filter(
    (slot) => slot.staff_id === staff.id,
  );

  const handleDragOver = (e: React.DragEvent, time: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
    setDragTargetTime(time);
    setDragTargetForDrop(time);
  };

  const handleOuterDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
    setDragTargetForDrop(null);
  };

  const handleCellDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragTargetForDrop && onDrop) {
      onDrop(e, staff.id, dragTargetForDrop);
    }
    setDragTargetForDrop(null);
  };

  return (
    <Box
      style={{
        flex: 1,
        minWidth: 80,
        borderRight: "1px solid #e0e0e0",
        backgroundColor: "#f9f9f9",
      }}
      data-staff-id={staff.id}
    >
      <Box
        style={{
          height: 50,
          padding: 10,
          backgroundColor: staff.color + "20",
          fontWeight: 600,
          borderBottom: "1px solid #e0e0e0",
          textAlign: "center",
        }}
      >
        <Text fw={600} style={{ color: staff.color }}>
          {staff.name}
        </Text>
      </Box>
      <Box
        style={{
          position: "relative",
          height: 1200,
          backgroundColor: isOver ? "#f0f7ff" : "#fff",
        }}
        onDragOver={handleOuterDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleCellDrop}
      >
        {/* Time slot cells (background) */}
        {TIME_SLOTS.map((time) => {
          // Check if this slot is blocked - compare using dayjs with same timezone
          const slotTimeLocal = parseLocalTime(selectedDate, time);
          const isBlocked = blockedSlots.some(
            (slot) =>
              slot.staff_id === staff.id &&
              dayjs(slotTimeLocal).isAfter(
                dayjs(slot.start_time).subtract(1, "minute"),
              ) &&
              dayjs(slotTimeLocal).isBefore(
                dayjs(slot.end_time).add(1, "minute"),
              ),
          );

          return (
            <Box
              key={time}
              data-time-slot={time}
              data-staff-id={staff.id}
              style={{
                height: 25,
                borderBottom: "1px solid #e0e0e0",
                backgroundColor: isBlocked
                  ? "transparent" // Will be covered by blocked slot
                  : dragTargetTime === time
                    ? "#e3f2fd"
                    : "inherit",
                cursor: isBlocked ? "not-allowed" : "pointer",
              }}
              onClick={() => !isBlocked && onCellClick(staff.id, time)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!isBlocked) {
                  setContextMenuPos({ x: e.clientX, y: e.clientY, time });
                }
              }}
              onDragOver={(e) => handleDragOver(e, time)}
              onDragLeave={() => setDragTargetTime(null)}
              onDrop={(e) => onDrop && onDrop(e, staff.id, time)}
            />
          );
        })}

        {/* Render blocked slots as positioned boxes with resize handles */}
        {staffBlockedSlots.map((slot) => {
          const startTime = toArgentinaDate(slot.start_time);
          const endTime = toArgentinaDate(slot.end_time);
          const startHour = startTime.hour();
          const startMinute = startTime.minute();
          const durationMinutes = endTime.diff(startTime, "minute");

          const heightPercent = (durationMinutes / 720) * 100;
          const topPercent = (((startHour - 9) * 60 + startMinute) / 720) * 100;

          return (
            <Box
              key={slot.id}
              style={{
                position: "absolute",
                top: `${topPercent}%`,
                left: 0,
                right: 0,
                height: `${Math.max(heightPercent, 2)}%`,
                background: `
                  repeating-linear-gradient(
                    45deg,
                    #9e9e9e,
                    #9e9e9e 3px,
                    #bdbdbd 3px,
                    #bdbdbd 6px
                  )
                `,
                borderRadius: 4,
                padding: "2px 4px",
                opacity: 0.6,
                cursor: "grab",
                zIndex: 5,
              }}
            >
              {/* Top resize handle */}
              <Box
                style={{
                  position: "absolute",
                  top: 0,
                  left: "10%",
                  right: "10%",
                  height: 16,
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderRadius: 2,
                  cursor: "n-resize",
                  zIndex: 10,
                  touchAction: "none",
                }}
                onPointerDown={(e: React.PointerEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingBlockedSlot({
                    id: slot.id,
                    edge: "top",
                    startY: e.clientY,
                    originalStart: slot.start_time,
                    originalEnd: slot.end_time,
                  });
                }}
                onTouchStart={(e: React.TouchEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  setResizingBlockedSlot({
                    id: slot.id,
                    edge: "top",
                    startY: touch.clientY,
                    originalStart: slot.start_time,
                    originalEnd: slot.end_time,
                  });
                  // Store in window refs as backup for touch handlers
                  (window as any).__blockedSlotResizeEdge = "top";
                  (window as any).__blockedSlotResizeId = slot.id;
                  (window as any).__blockedSlotResizeStartY = touch.clientY;
                  (window as any).__blockedSlotResizeOriginalStart = slot.start_time;
                  (window as any).__blockedSlotResizeOriginalEnd = slot.end_time;
                }}
              />

              <Text size="xs" c="white" lineClamp={1}>
                Bloqueado
              </Text>

              {/* Delete button */}
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                style={{ position: "absolute", top: 2, right: 2 }}
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDeleteBlockedSlot(slot.id);
                }}
              >
                <IconTrash size={12} />
              </ActionIcon>

              {/* Bottom resize handle */}
              <Box
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "10%",
                  right: "10%",
                  height: 16,
                  backgroundColor: "rgba(255,255,255,0.6)",
                  borderRadius: 2,
                  cursor: "s-resize",
                  zIndex: 10,
                  touchAction: "none",
                }}
                onPointerDown={(e: React.PointerEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingBlockedSlot({
                    id: slot.id,
                    edge: "bottom",
                    startY: e.clientY,
                    originalStart: slot.start_time,
                    originalEnd: slot.end_time,
                  });
                }}
                onTouchStart={(e: React.TouchEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  setResizingBlockedSlot({
                    id: slot.id,
                    edge: "bottom",
                    startY: touch.clientY,
                    originalStart: slot.start_time,
                    originalEnd: slot.end_time,
                  });
                  // Store in window refs as backup for touch handlers
                  (window as any).__blockedSlotResizeEdge = "bottom";
                  (window as any).__blockedSlotResizeId = slot.id;
                  (window as any).__blockedSlotResizeStartY = touch.clientY;
                  (window as any).__blockedSlotResizeOriginalStart = slot.start_time;
                  (window as any).__blockedSlotResizeOriginalEnd = slot.end_time;
                }}
              />
            </Box>
          );
        })}

        {/* Global pointer AND touch move/up for blocked slot resize */}
        {resizingBlockedSlot && (
          <>
            <Box
              style={{ position: "fixed", inset: 0, zIndex: 100, touchAction: "none" }}
              onPointerMove={(e: React.PointerEvent) => {
                const deltaY = e.clientY - resizingBlockedSlot.startY;
                const deltaMinutes = Math.round(deltaY / (1200 / 720));

                let newStart = dayjs(resizingBlockedSlot.originalStart);
                let newEnd = dayjs(resizingBlockedSlot.originalEnd);

                if (resizingBlockedSlot.edge === "top") {
                  newStart = newStart.add(deltaMinutes, "minute");
                  // Snap to 15 min
                  newStart = newStart
                    .startOf("minute")
                    .add(Math.round(newStart.minute() / 15) * 15, "minute");
                } else {
                  newEnd = newEnd.add(deltaMinutes, "minute");
                  // Snap to 15 min
                  newEnd = newEnd
                    .startOf("minute")
                    .add(Math.round(newEnd.minute() / 15) * 15, "minute");
                }

                // Update visually in real-time (optimistic)
                // This would need to be implemented with state
              }}
              onPointerUp={(e: React.PointerEvent) => {
                const deltaY = e.clientY - resizingBlockedSlot.startY;
                const deltaMinutes = Math.round(deltaY / (1200 / 720));

                let newStart = dayjs(resizingBlockedSlot.originalStart);
                let newEnd = dayjs(resizingBlockedSlot.originalEnd);

                if (resizingBlockedSlot.edge === "top") {
                  newStart = newStart.add(deltaMinutes, "minute");
                  newStart = newStart
                    .startOf("minute")
                    .add(Math.round(newStart.minute() / 15) * 15, "minute");
                } else {
                  newEnd = newEnd.add(deltaMinutes, "minute");
                  newEnd = newEnd
                    .startOf("minute")
                    .add(Math.round(newEnd.minute() / 15) * 15, "minute");
                }

                // Save to DB
                onResizeBlockedSlot(
                  resizingBlockedSlot.id,
                  newStart.toISOString(),
                  newEnd.toISOString(),
                );
                setResizingBlockedSlot(null);
              }}
              onTouchMove={(e: React.TouchEvent) => {
                e.preventDefault();
                const touch = e.touches[0];
                // Use window refs as fallback when resizingBlockedSlot is cleared
                const startY = resizingBlockedSlot?.startY ?? (window as any).__blockedSlotResizeStartY ?? touch.clientY;
                const originalStart = resizingBlockedSlot?.originalStart ?? (window as any).__blockedSlotResizeOriginalStart ?? '';
                const originalEnd = resizingBlockedSlot?.originalEnd ?? (window as any).__blockedSlotResizeOriginalEnd ?? '';
                const edge = resizingBlockedSlot?.edge ?? (window as any).__blockedSlotResizeEdge ?? 'bottom';

                const deltaY = touch.clientY - startY;
                const deltaMinutes = Math.round(deltaY / (1200 / 720));

                let newStart = dayjs(originalStart);
                let newEnd = dayjs(originalEnd);

                if (edge === "top") {
                  newStart = newStart.add(deltaMinutes, "minute");
                  newStart = newStart
                    .startOf("minute")
                    .add(Math.round(newStart.minute() / 15) * 15, "minute");
                } else {
                  newEnd = newEnd.add(deltaMinutes, "minute");
                  newEnd = newEnd
                    .startOf("minute")
                    .add(Math.round(newEnd.minute() / 15) * 15, "minute");
                }
              }}
              onTouchEnd={(e: React.TouchEvent) => {
                const touch = e.changedTouches[0];
                // Use window refs as fallback when resizingBlockedSlot is cleared
                const startY = resizingBlockedSlot?.startY ?? (window as any).__blockedSlotResizeStartY ?? touch.clientY;
                const originalStart = resizingBlockedSlot?.originalStart ?? (window as any).__blockedSlotResizeOriginalStart ?? '';
                const originalEnd = resizingBlockedSlot?.originalEnd ?? (window as any).__blockedSlotResizeOriginalEnd ?? '';
                const edge = resizingBlockedSlot?.edge ?? (window as any).__blockedSlotResizeEdge ?? 'bottom';
                const id = resizingBlockedSlot?.id ?? (window as any).__blockedSlotResizeId ?? '';

                const deltaY = touch.clientY - startY;
                const deltaMinutes = Math.round(deltaY / (1200 / 720));

                let newStart = dayjs(originalStart);
                let newEnd = dayjs(originalEnd);

                if (edge === "top") {
                  newStart = newStart.add(deltaMinutes, "minute");
                  newStart = newStart
                    .startOf("minute")
                    .add(Math.round(newStart.minute() / 15) * 15, "minute");
                } else {
                  newEnd = newEnd.add(deltaMinutes, "minute");
                  newEnd = newEnd
                    .startOf("minute")
                    .add(Math.round(newEnd.minute() / 15) * 15, "minute");
                }

                // Save to DB
                onResizeBlockedSlot(
                  id,
                  newStart.toISOString(),
                  newEnd.toISOString(),
                );
                setResizingBlockedSlot(null);
                // Clean up window refs
                delete (window as any).__blockedSlotResizeEdge;
                delete (window as any).__blockedSlotResizeId;
                delete (window as any).__blockedSlotResizeStartY;
                delete (window as any).__blockedSlotResizeOriginalStart;
                delete (window as any).__blockedSlotResizeOriginalEnd;
              }}
            />
          </>
        )}

        {/* Context Menu */}
        {contextMenuPos && (
          <Box
            style={{
              position: "fixed",
              left: contextMenuPos.x,
              top: contextMenuPos.y,
              zIndex: 1000,
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              padding: "4px 0",
              minWidth: 160,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box px="xs" py={4} style={{ borderBottom: "1px solid #e0e0e0" }}>
              <Text size="xs" fw={600} c="dimmed">
                Bloquear horario
              </Text>
            </Box>
            <Box
              px="xs"
              py={6}
              style={{ cursor: "pointer" }}
              onClick={() => {
                onBlockSlot(staff.id, contextMenuPos.time, 15);
                setContextMenuPos(null);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Group gap="xs">
                <IconClock size={14} />
                <Text size="sm">15 minutos</Text>
              </Group>
            </Box>
            <Box
              px="xs"
              py={6}
              style={{ cursor: "pointer" }}
              onClick={() => {
                onBlockSlot(staff.id, contextMenuPos.time, 30);
                setContextMenuPos(null);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Group gap="xs">
                <IconClock size={14} />
                <Text size="sm">30 minutos</Text>
              </Group>
            </Box>
            <Box
              px="xs"
              py={6}
              style={{ cursor: "pointer" }}
              onClick={() => {
                onBlockSlot(staff.id, contextMenuPos.time, 60);
                setContextMenuPos(null);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Group gap="xs">
                <IconClock size={14} />
                <Text size="sm">1 hora</Text>
              </Group>
            </Box>
            <Box
              px="xs"
              py={6}
              style={{ cursor: "pointer" }}
              onClick={() => {
                onBlockSlot(staff.id, contextMenuPos.time, -1); // -1 = resto del día hasta 20:45
                setContextMenuPos(null);
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#f5f5f5")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              <Group gap="xs">
                <IconCalendarOff size={14} />
                <Text size="sm">Resto del día</Text>
              </Group>
            </Box>
          </Box>
        )}

        {/* Close context menu on click outside */}
        {contextMenuPos && (
          <Box
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setContextMenuPos(null)}
          />
        )}
        {cellAppointments.map((apt) => (
          <AppointmentBlock
            key={apt.id}
            appointment={apt}
            data-appointment-id={apt.id}
            data-staff-id={staff.id}
            onDragStart={onDragStart}
            onTouchDragStart={onTouchDragStart}
            onTouchDragMove={onTouchDragMove}
            onTouchDragEnd={onTouchDragEnd}
            onClick={onAppointmentClick}
            onResizeStart={onResizeStart}
            onResizeMove={onResizeMove}
            onResizeEnd={onResizeEnd}
            isResizing={isResizing}
            isTouchDragging={touchDragging}
          />
        ))}
      </Box>
    </Box>
  );
}

export function AppointmentGrid() {
  const { user } = useAuthStore();
  const {
    appointments,
    services,
    staff,
    clients,
    blockedSlots,
    selectedDate,
    selectedStaffId,
    fetchAppointments,
    fetchServices,
    fetchStaff,
    fetchClients,
    fetchBlockedSlots,
    createBlockedSlot,
    deleteBlockedSlot,
    createAppointment,
    updateAppointment,
    moveAppointment,
    deleteAppointment,
    createClient,
  } = useAppointmentStore();

  const isMobile = useMediaQuery("(max-width: 500px)");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Sincronizar selectedStaffId cuando staff carga en móvil
  useEffect(() => {
    if (isClient && isMobile && staff.length > 0 && !selectedStaffId) {
      useAppointmentStore.getState().setSelectedStaffId(staff[0].id);
    }
  }, [isClient, isMobile, staff.length, selectedStaffId]);

  // En móvil: filtrar staff por el seleccionado (si no hay ninguno, usar el primero)
  // En desktop/tablet: mostrar todos
  const effectiveStaffId =
    isClient && isMobile
      ? selectedStaffId || (staff.length > 0 ? staff[0].id : null)
      : null;

  const displayedStaff = effectiveStaffId
    ? staff.filter((s) => s.id === effectiveStaffId)
    : staff;

  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);

  const [editModalOpened, { open: openEditModal, close: closeEditModal }] =
    useDisclosure(false);
  const [
    clientModalOpened,
    { open: openClientModal, close: closeClientModal },
  ] = useDisclosure(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<Appointment | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [dragTargetTime, setDragTargetTime] = useState<string | null>(null);
  const [draggedAppointmentId, setDraggedAppointmentId] = useState<
    string | null
  >(null);

  // Touch drag states for mobile
  const [touchDragging, setTouchDragging] = useState(false);
  const [touchDragStartPos, setTouchDragStartPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const touchDragAppointmentIdRef = useRef<string | null>(null);
  const touchDragSourceStaffIdRef = useRef<string | null>(null);

  // Refs to store handlers for touch drag
  const touchDragStartRef = useRef<typeof handleTouchDragStart | null>(null);
  const touchDragMoveRef = useRef<typeof handleTouchDragMove | null>(null);
  const touchDragEndRef = useRef<typeof handleTouchDragEnd | null>(null);

  // Delete confirmation states
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);

  // Resize states
  const [resizing, setResizing] = useState<"top" | "bottom" | null>(null);
  const [resizeAppointmentId, setResizeAppointmentId] = useState<string | null>(
    null,
  );
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeOriginalStart, setResizeOriginalStart] = useState<string | null>(
    null,
  );
  const [resizeOriginalEnd, setResizeOriginalEnd] = useState<string | null>(
    null,
  );
  const [justResized, setJustResized] = useState(false);

  // Ref for appointments to avoid stale closures
  const appointmentsRef = useRef(appointments);
  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);

  const [newAppointment, setNewAppointment] = useState({
    client_id: "",
    service_id: "",
    staff_id: "",
    time: "09:00",
    end_time: "09:30",
    notes: "",
  });

  // Auto-calculate end time when service changes
  useEffect(() => {
    if (!newAppointment.service_id || !newAppointment.time) return;

    const service = services.find((s) => s.id === newAppointment.service_id);
    if (!service) return;

    const [hours, minutes] = newAppointment.time.split(":").map(Number);
    const totalMinutes =
      hours * 60 + minutes + (service.duration_minutes || 30);
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    const endTime = `${String(Math.min(endHours, 20)).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

    setNewAppointment((prev) => ({ ...prev, end_time: endTime }));
  }, [newAppointment.service_id]);

  useEffect(() => {
    if (user) {
      fetchServices();
      fetchStaff();
      fetchClients();
      fetchAppointments(selectedDate);
      fetchBlockedSlots(selectedDate);
    }
  }, [user, selectedDate]);

  // Calculate end time based on service duration
  const calculateEndTime = (
    startTime: string | null | undefined,
    serviceId?: string,
  ): string => {
    if (!startTime) return "09:30";
    const service = services.find((s) => s.id === serviceId);
    const duration = service?.duration_minutes || 30;

    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes + duration;

    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    // Handle case where end time goes to next day (cap at 20:45)
    const finalTime = `${String(Math.min(endHours, 20)).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
    return finalTime;
  };

  // Countdown for delete confirmation
  useEffect(() => {
    if (!deleteConfirm) return;

    if (deleteCountdown <= 0) {
      setDeleteConfirm(false);
      setDeleteCountdown(5);
      return;
    }

    const timer = setTimeout(() => {
      setDeleteCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [deleteConfirm, deleteCountdown]);

  const handleDeleteClick = () => {
    if (deleteConfirm) {
      // Second click - confirm delete
      deleteAppointment(editingAppointment!.id);
      closeEditModal();
      setNewAppointment({
        client_id: "",
        service_id: "",
        staff_id: "",
        time: "09:00",
        end_time: "09:30",
        notes: "",
      });
      setEditingAppointment(null);
      setDeleteConfirm(false);
      setDeleteCountdown(5);
    } else {
      // First click - activate confirmation mode
      setDeleteConfirm(true);
    }
  };

  // Resize handlers - use refs to avoid stale closures
  const resizingRef = useRef<"top" | "bottom" | null>(null);
  const resizeAppointmentIdRef = useRef<string | null>(null);
  const resizeStartYRef = useRef(0);
  const resizeOriginalStartRef = useRef<string | null>(null);
  const resizeOriginalEndRef = useRef<string | null>(null);

  const handleResizeStart = (
    edge: "top" | "bottom",
    appointmentId: string,
    startTime: string,
    endTime: string,
    e: React.PointerEvent,
  ) => {
    e.stopPropagation();
    resizingRef.current = edge;
    setResizing(edge);
    resizeAppointmentIdRef.current = appointmentId;
    setResizeAppointmentId(appointmentId);
    resizeStartYRef.current = e.clientY;
    setResizeStartY(e.clientY);
    resizeOriginalStartRef.current = startTime;
    setResizeOriginalStart(startTime);
    resizeOriginalEndRef.current = endTime;
    setResizeOriginalEnd(endTime);
  };

  // Handle resize move - updates appointment while dragging
  const handleResizeMove = useCallback(
    (appointmentId: string, clientY: number) => {
      if (
        !resizingRef.current ||
        resizeAppointmentIdRef.current !== appointmentId ||
        !resizeOriginalStartRef.current ||
        !resizeOriginalEndRef.current
      )
        return;

      const deltaY = clientY - resizeStartYRef.current;
      const deltaMinutes = Math.round(deltaY / (1200 / 720)); // 1200px = 12 hours = 720 minutes

      let newStartTime = new Date(resizeOriginalStartRef.current);
      let newEndTime = new Date(resizeOriginalEndRef.current);

      if (resizingRef.current === "top") {
        // Resizing from top - change start time
        newStartTime = new Date(
          newStartTime.getTime() + deltaMinutes * 60 * 1000,
        );

        // Snap to 15-minute intervals
        const minutes = newStartTime.getMinutes();
        const snappedMinutes = Math.round(minutes / 15) * 15;
        newStartTime.setMinutes(snappedMinutes, 0, 0);

        // Don't allow start after end
        if (newStartTime >= newEndTime) {
          newStartTime = new Date(newEndTime.getTime() - 15 * 60 * 1000);
        }
      } else {
        // Resizing from bottom - change end time
        newEndTime = new Date(newEndTime.getTime() + deltaMinutes * 60 * 1000);

        // Snap to 15-minute intervals
        const minutes = newEndTime.getMinutes();
        const snappedMinutes = Math.round(minutes / 15) * 15;
        newEndTime.setMinutes(snappedMinutes, 0, 0);

        // Don't allow end before start
        if (newEndTime <= newStartTime) {
          newEndTime = new Date(newStartTime.getTime() + 15 * 60 * 1000);
        }
      }

      // Update the appointment locally (for visual feedback)
      const updatedAppointments = appointmentsRef.current.map((a) => {
        if (a.id === resizeAppointmentIdRef.current) {
          return {
            ...a,
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString(),
          };
        }
        return a;
      });
      useAppointmentStore.setState({ appointments: updatedAppointments });
    },
    [],
  );

  // Handle resize end - save to database
  const handleResizeEnd = useCallback(async () => {
    if (!resizingRef.current || !resizeAppointmentIdRef.current) {
      setResizing(null);
      setResizeAppointmentId(null);
      return;
    }

    // Get the updated appointment from state
    const appointment = appointmentsRef.current.find(
      (a) => a.id === resizeAppointmentIdRef.current,
    );
    if (!appointment) {
      setResizing(null);
      setResizeAppointmentId(null);
      return;
    }

    // Update in database
    await updateAppointment(resizeAppointmentIdRef.current, {
      start_time: appointment.start_time,
      end_time: appointment.end_time,
    });

    // Reset refs and state
    resizingRef.current = null;
    resizeAppointmentIdRef.current = null;
    resizeStartYRef.current = 0;
    resizeOriginalStartRef.current = null;
    resizeOriginalEndRef.current = null;
    setResizing(null);
    setResizeAppointmentId(null);
    setResizeOriginalStart(null);
    setResizeOriginalEnd(null);
  }, []);

  // Remove old global event listeners - now using setPointerCapture in component

  // Note: Global mouse listeners removed because pointer events in AppointmentBlock handle capture directly

  const handleCellDrop = async (
    e: React.DragEvent,
    staffId: string,
    timeSlot: string,
  ) => {
    const appointmentId = e.dataTransfer.getData("appointmentId");
    const sourceStaffId = e.dataTransfer.getData("sourceStaffId");

    if (appointmentId && timeSlot) {
      const newDateTime = parseLocalTime(selectedDate, timeSlot);
      const newStaffId =
        sourceStaffId && sourceStaffId !== staffId && sourceStaffId !== ""
          ? staffId
          : undefined;
      const result = await moveAppointment(
        appointmentId,
        newDateTime.toISOString(),
        newStaffId,
      );

      if (result.error) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
      } else {
        notifications.show({
          title: "Turno movido",
          message: `Turno movido a las ${timeSlot}`,
          color: "green",
        });
      }
    }
  };

  // Touch drag handlers for mobile
  const handleTouchDragStart = useCallback(
    (
      id: string,
      sourceStaffId: string | undefined,
      startX: number,
      startY: number,
    ) => {
      setTouchDragging(true);
      setTouchDragStartPos({ x: startX, y: startY });
      touchDragAppointmentIdRef.current = id;
      touchDragSourceStaffIdRef.current = sourceStaffId || null;
      setDraggedAppointmentId(id);
    },
    [],
  );

  const handleTouchDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!touchDragging || !touchDragAppointmentIdRef.current) return;

      // Update drag target time based on cursor position
      const element = document.elementFromPoint(clientX, clientY);
      if (element) {
        // Try to find time slot cell
        const timeCell = element.closest("[data-time-slot]") as HTMLElement;
        if (timeCell) {
          const timeSlot = timeCell.dataset.timeSlot;
          if (timeSlot) {
            setDragTargetTime(timeSlot);
          }
        }
      }
    },
    [touchDragging],
  );

  const handleTouchDragEnd = useCallback(
    async (clientX: number, clientY: number) => {
      if (!touchDragging || !touchDragAppointmentIdRef.current) {
        setTouchDragging(false);
        setDragTargetTime(null);
        return;
      }

      const element = document.elementFromPoint(clientX, clientY);
      if (element) {
        // Find the cell with staff and time data
        const cell = element.closest("[data-staff-id]") as HTMLElement;
        const timeCell = element.closest("[data-time-slot]") as HTMLElement;

        let targetStaffId: string | undefined;
        let targetTimeSlot: string | undefined;

        if (cell) {
          targetStaffId = cell.dataset.staffId || undefined;
        }
        if (timeCell) {
          targetTimeSlot = timeCell.dataset.timeSlot;
        }

        // Also try to get from displayedStaff if we're on mobile
        if (!targetStaffId && displayedStaff.length > 0) {
          targetStaffId = displayedStaff[0].id;
        }

        if (targetStaffId && targetTimeSlot) {
          const newDateTime = parseLocalTime(selectedDate, targetTimeSlot);
          const sourceStaffId = touchDragSourceStaffIdRef.current;
          const newStaffId =
            sourceStaffId && sourceStaffId !== targetStaffId
              ? targetStaffId
              : undefined;

          const result = await moveAppointment(
            touchDragAppointmentIdRef.current,
            newDateTime.toISOString(),
            newStaffId,
          );

          if (result.error) {
            notifications.show({
              title: "Error",
              message: result.error,
              color: "red",
            });
          } else {
            notifications.show({
              title: "Turno movido",
              message: `Turno movido a las ${targetTimeSlot}`,
              color: "green",
            });
          }
        }
      }

      setTouchDragging(false);
      setTouchDragStartPos(null);
      touchDragAppointmentIdRef.current = null;
      touchDragSourceStaffIdRef.current = null;
      setDraggedAppointmentId(null);
      setDragTargetTime(null);
    },
    [touchDragging, selectedDate, displayedStaff],
  );

  // Simplified touch drop for grid cells
  const handleTouchDrop = useCallback(
    async (appointmentId: string, staffId: string, timeSlot: string) => {
      const sourceStaffId = touchDragSourceStaffIdRef.current;
      const newStaffId =
        sourceStaffId && sourceStaffId !== staffId ? staffId : undefined;

      const newDateTime = parseLocalTime(selectedDate, timeSlot);
      const result = await moveAppointment(
        appointmentId,
        newDateTime.toISOString(),
        newStaffId,
      );

      if (result.error) {
        notifications.show({
          title: "Error",
          message: result.error,
          color: "red",
        });
      } else {
        notifications.show({
          title: "Turno movido",
          message: `Turno movido a las ${timeSlot}`,
          color: "green",
        });
      }
    },
    [selectedDate],
  );

  const handleDragStart = (
    e: React.DragEvent,
    id: string,
    sourceStaffId?: string,
  ) => {
    setDraggedAppointmentId(id);
    e.dataTransfer.setData("appointmentId", id);
    if (sourceStaffId) {
      e.dataTransfer.setData("sourceStaffId", sourceStaffId);
    }
  };

  useEffect(() => {
    if (!dragTargetTime) {
      setDraggedAppointmentId(null);
    }
  }, [dragTargetTime]);

  const handleCellClick = (staffId: string, timeSlot: string) => {
    setNewAppointment({
      client_id: "",
      service_id: "",
      staff_id: staffId,
      time: timeSlot,
      end_time: "09:30", // default, se actualiza cuando selecciona servicio
      notes: "",
    });
    setIsEditing(false);
    openModal();
  };

  // Handle blocking a time slot
  const handleBlockSlot = async (
    staffId: string,
    timeSlot: string,
    durationMinutes: number,
  ) => {
    const startTime = parseLocalTime(selectedDate, timeSlot);

    // "Resto del día" special: block until 20:45
    let endDateTime: dayjs.Dayjs;
    if (durationMinutes === -1) {
      // Resto del día: until 20:45
      const endOfDay = parseLocalTime(selectedDate, "20:45");
      endDateTime = dayjs(endOfDay);
    } else {
      endDateTime = dayjs(startTime).add(durationMinutes, "minute");
    }

    const result = await createBlockedSlot(
      staffId,
      startTime.toISOString(),
      endDateTime.toISOString(),
    );

    if (result.error) {
      notifications.show({
        title: "Error",
        message: result.error,
        color: "red",
      });
    } else {
      notifications.show({
        title: "Horario bloqueado",
        message: `Bloqueado desde ${timeSlot} hasta ${endDateTime.format("HH:mm")}`,
        color: "green",
      });
    }
  };

  // Handle resizing a blocked slot
  const handleResizeBlockedSlot = async (
    id: string,
    newStartTime: string,
    newEndTime: string,
  ) => {
    try {
      const { error } = await database
        .from("blocked_slots")
        .update({ start_time: newStartTime, end_time: newEndTime })
        .eq("id", id);

      if (error) {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      } else {
        notifications.show({
          title: "Horario actualizado",
          message: "Bloqueo redimensionado",
          color: "green",
        });
        fetchBlockedSlots(selectedDate);
      }
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  // Handle deleting a blocked slot
  const handleDeleteBlockedSlot = async (id: string) => {
    try {
      const { error } = await database
        .from("blocked_slots")
        .delete()
        .eq("id", id);

      if (error) {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      } else {
        notifications.show({
          title: "Bloqueo eliminado",
          message: "Horario desbloqueado",
          color: "green",
        });
        fetchBlockedSlots(selectedDate);
      }
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    }
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setNewAppointment({
      client_id: appointment.client_id,
      service_id: appointment.service_id,
      staff_id: appointment.staff_id || "",
      time: toArgentinaDate(appointment.start_time).format("HH:mm"),
      end_time: toArgentinaDate(appointment.end_time).format("HH:mm"),
      notes: appointment.notes || "",
    });
    setIsEditing(true);
    openEditModal();
  };

  const isAppointmentInPast = (): boolean => {
    const nowArgentina = toArgentinaDate(new Date());
    const selectedDateParsed = dayjs.utc(selectedDate);
    const [hours, minutes] = newAppointment.time.split(":").map(Number);

    const selectedDateTime = selectedDateParsed
      .subtract(3, "hour")
      .hour(hours)
      .minute(minutes);

    return selectedDateTime.isBefore(nowArgentina);
  };

  const handleCreateAppointment = async () => {
    const newApt = newAppointment;
    console.log('handleCreateAppointment - newAppointment:', newApt);
    console.log('handleCreateAppointment - services:', services);

    if (isAppointmentInPast()) {
      closeModal();
      notifications.show({
        title: "Fecha inválida",
        message: "No puedes crear turnos en fechas u horas pasadas",
        color: "red",
      });
      return;
    }

    if (!newApt.client_id) {
      notifications.show({
        title: "Cliente requerido",
        message: "Selecciona un cliente",
        color: "red",
      });
      return;
    }

    if (!newApt.service_id) {
      notifications.show({
        title: "Servicio requerido",
        message: "Selecciona un servicio",
        color: "red",
      });
      return;
    }

    if (!newApt.staff_id) {
      notifications.show({
        title: "Staff requerido",
        message: "Selecciona un staff",
        color: "red",
      });
      return;
    }

    const service = services.find((s) => s.id === newApt.service_id);
    if (!service) {
      notifications.show({
        title: "Error",
        message: "Servicio no encontrado",
        color: "red",
      });
      return;
    }

    const startTime = parseLocalTime(selectedDate, newApt.time);
    let endTimeValue = newApt.end_time;
    if (!endTimeValue) {
      endTimeValue = newApt.time;
    }
    const endTime = parseLocalTime(selectedDate, endTimeValue);

    const result = await createAppointment({
      client_id: newApt.client_id,
      service_id: newApt.service_id,
      staff_id: newApt.staff_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: newApt.notes || null,
      status: "confirmed",
    });

    if (result.error) {
      notifications.show({
        title: "Error",
        message: result.error,
        color: "red",
      });
    } else {
      notifications.show({
        title: "Turno creado",
        message: "El turno se creó correctamente",
        color: "green",
      });
      closeModal();
    }
    setNewAppointment({
      client_id: "",
      service_id: "",
      staff_id: "",
      time: "09:00",
      end_time: "09:30",
      notes: "",
    });
  };

  const handleUpdateAppointment = async () => {
    if (
      !editingAppointment ||
      !newAppointment.client_id ||
      !newAppointment.service_id
    ) {
      return;
    }

    const service = services.find((s) => s.id === newAppointment.service_id);
    if (!service) return;

    const startTime = parseLocalTime(selectedDate, newAppointment.time);
    // Usar el end_time del select, o calcular si no está definido
    let endTimeValue = newAppointment.end_time;
    if (!endTimeValue) {
      endTimeValue = newAppointment.time; // fallback
    }
    const endTime = parseLocalTime(selectedDate, endTimeValue);

    await updateAppointment(editingAppointment.id, {
      client_id: newAppointment.client_id,
      service_id: newAppointment.service_id,
      staff_id: newAppointment.staff_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      notes: newAppointment.notes || null,
    });

    closeEditModal();
    setNewAppointment({
      client_id: "",
      service_id: "",
      staff_id: "",
      time: "09:00",
      end_time: "09:30",
      notes: "",
    });
    setEditingAppointment(null);
  };

  const handleDeleteAppointment = async () => {
    if (!editingAppointment) return;

    await deleteAppointment(editingAppointment.id);
    closeEditModal();
    setNewAppointment({
      client_id: "",
      service_id: "",
      staff_id: "",
      time: "09:00",
      end_time: "09:30",
      notes: "",
    });
    setEditingAppointment(null);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      notifications.show({
        title: "Error",
        message: "El nombre del cliente es requerido",
        color: "red",
      });
      return;
    }

    const result = await createClient({
      name: newClientName.trim(),
      phone: newClientPhone.trim() || null,
      email: newClientEmail.trim() || null,
    });

    if (result.error) {
      notifications.show({
        title: "Error",
        message: result.error,
        color: "red",
      });
    } else {
      notifications.show({
        title: "Cliente creado",
        message: "El cliente se creó correctamente",
        color: "green",
      });
      if (result.clientId) {
        setNewAppointment((prev) => ({
          ...prev,
          client_id: result.clientId as string,
        }));
      }
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
      closeClientModal();
    }
  };

  // Register touch drag handlers globally for child components
  useEffect(() => {
    touchDragStartRef.current = handleTouchDragStart;
    touchDragMoveRef.current = handleTouchDragMove;
    touchDragEndRef.current = handleTouchDragEnd;

    return () => {
      touchDragStartRef.current = null;
      touchDragMoveRef.current = null;
      touchDragEndRef.current = null;
    };
  }, [handleTouchDragStart, handleTouchDragMove, handleTouchDragEnd]);

  return (
    <Box style={{ padding: isClient && isMobile ? 8 : 16 }}>
      {/* Indicador de staff seleccionado en móvil - fijo, no hace scroll */}
      {isClient && isMobile && (
        <Box
          style={{
            backgroundColor: "#f5f5f5",
            textAlign: "center",
            position: "fixed",
            top: 40,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: "4px 8px",
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          {/* Native select for mobile - works better with touch */}
          <NativeSelect
            value={effectiveStaffId || ""}
            onChange={(e) =>
              useAppointmentStore.getState().setSelectedStaffId(e.target.value)
            }
            style={{
              width: "100%",
              maxWidth: 220,
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ced4da",
              backgroundColor: "#fff",
              textAlign: "center",
              margin: "0 auto",
              touchAction: "manipulation",
              pointerEvents: "auto",
              position: "relative",
              zIndex: 1000,
            }}
            disabled={!isClient || staff.length === 0}
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Box>
      )}

      {/* Spacer para que no tape el contenido cuando está fixed */}
      {isClient && isMobile && <Box style={{ height: 40 }} />}

      <Paper withBorder shadow="sm" style={{ overflow: "auto" }}>
        <Box
          style={{
            minWidth: isClient && isMobile ? 300 : 600,
            display: "flex",
          }}
        >
          <Box style={{ flex: "0 0 60px", borderRight: "1px solid #e0e0e0" }}>
            <Box
              style={{
                height: 50,
                padding: 10,
                backgroundColor: "#f5f5f5",
                fontWeight: 600,
                borderBottom: "1px solid #e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Hora
            </Box>
            <Box style={{ height: 1200 }}>
              {TIME_SLOTS.map((time) => (
                <Box
                  key={time}
                  style={{
                    height: 25,
                    borderBottom: "1px solid #e0e0e0",
                    padding: "2px 8px",
                    fontSize: 10,
                    color: "#666",
                  }}
                  onDragOver={(e) => {
                    e.dataTransfer.setData("targetTimeSlot", time);
                  }}
                >
                  {time}
                </Box>
              ))}
            </Box>
          </Box>
          {displayedStaff.map((s) => (
            <GridCell
              key={s.id}
              staff={s}
              appointments={appointments}
              blockedSlots={blockedSlots}
              selectedDate={selectedDate}
              onDrop={handleCellDrop}
              onTouchDrop={handleTouchDrop}
              onDragStart={handleDragStart}
              onTouchDragStart={handleTouchDragStart}
              onTouchDragMove={handleTouchDragMove}
              onTouchDragEnd={handleTouchDragEnd}
              touchDragging={touchDragging}
              onCellClick={handleCellClick}
              onAppointmentClick={handleAppointmentClick}
              onBlockSlot={handleBlockSlot}
              onResizeBlockedSlot={handleResizeBlockedSlot}
              onDeleteBlockedSlot={handleDeleteBlockedSlot}
              dragTargetTime={dragTargetTime}
              setDragTargetTime={setDragTargetTime}
              onResizeStart={handleResizeStart}
              onResizeMove={handleResizeMove}
              onResizeEnd={handleResizeEnd}
              isResizing={!!resizing}
            />
          ))}
        </Box>
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={isEditing ? "Editar Turno" : "Nuevo Turno"}
        zIndex={1100}
      >
        <Stack>
          <Box pos="relative">
            <Text size="sm" fw={500} mb={4}>
              Cliente
            </Text>
            <Group gap="xs">
              <NativeSelect
                required
                data={[{value: '', label: 'Selecciona un cliente'}, ...clients.map((c) => ({ value: c.id, label: c.name }))]}
                value={newAppointment.client_id}
                onChange={(e) => {
                  console.log('Client onChange - value:', e.target.value, 'clients:', clients);
                  setNewAppointment((prev) => ({
                    ...prev,
                    client_id: e.target.value,
                  }));
                }}
                style={{ flex: 1 }}
              />
              <ActionIcon
                variant="filled"
                color="cyan"
                size="lg"
                onClick={(e) => {
                  e.stopPropagation();
                  openClientModal();
                }}
                title="Agregar cliente nuevo"
              >
                <IconPlus size={16} />
              </ActionIcon>
            </Group>
          </Box>
          <NativeSelect
            label="Servicio"
            required
            data={[{value: '', label: 'Elije un servicio'}, ...services.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.duration_minutes}min - Efvo: ${s.cash} / Tarj: ${s.card})`,
            }))]}
            value={newAppointment.service_id}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                service_id: e.target.value,
              }))
            }
          />
          <NativeSelect
            label="Staff"
            required
            data={staff.map((s) => ({ value: s.id, label: s.name }))}
            value={newAppointment.staff_id}
            onChange={(e) => {
              console.log('Staff onChange - value:', e.target.value, 'staff:', staff);
              setNewAppointment((prev) => ({
                ...prev,
                staff_id: e.target.value,
              }));
            }}
          />
          <NativeSelect
            label="Hora"
            required
            data={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
            value={newAppointment.time}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                time: e.target.value,
                end_time: calculateEndTime(e.target.value, prev.service_id),
              }))
            }
          />
          <NativeSelect
            label="Fin de turno"
            data={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
            value={newAppointment.end_time}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                end_time: e.target.value,
              }))
            }
          />
          <Textarea
            label="Notas"
            value={newAppointment.notes}
            onChange={(e) =>
              setNewAppointment((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
          <Button
            fullWidth
            style={{ opacity: 0.75 }}
            onClick={handleCreateAppointment}
          >
            Crear Turno
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={editModalOpened}
        onClose={() => {
          closeEditModal();
          setDeleteConfirm(false);
          setDeleteCountdown(5);
        }}
        title="Editar Turno"
        zIndex={1100}
      >
        <Stack>
          <Badge             color="cyan" mb="sm">
            Editar Turno
          </Badge>
          {newAppointment.client_id && (
            <Text fw={600}>
              Cliente:{" "}
              {clients.find((c) => c.id === newAppointment.client_id)?.name}
            </Text>
          )}
          <NativeSelect
            label="Servicio"
            required
            data={services.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.duration_minutes}min - Efvo: ${s.cash} / Tarj: ${s.card})`,
            }))}
            value={newAppointment.service_id}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                service_id: e.target.value,
              }))
            }
          />
          <NativeSelect
            label="Staff"
            required
            data={staff.map((s) => ({ value: s.id, label: s.name }))}
            value={newAppointment.staff_id}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                staff_id: e.target.value,
              }))
            }
          />
          <NativeSelect
            label="Hora"
            required
            data={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
            value={newAppointment.time}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                time: e.target.value,
                end_time: calculateEndTime(e.target.value, prev.service_id),
              }))
            }
          />
          <NativeSelect
            label="Fin de turno"
            data={TIME_SLOTS.map((t) => ({ value: t, label: t }))}
            value={newAppointment.end_time}
            onChange={(e) =>
              setNewAppointment((prev) => ({
                ...prev,
                end_time: e.target.value,
              }))
            }
          />
          <Textarea
            label="Notas"
            value={newAppointment.notes}
            onChange={(e) =>
              setNewAppointment((prev) => ({ ...prev, notes: e.target.value }))
            }
          />
          <Button
            fullWidth
            variant="outline"
            onClick={() => {
              notifications.show({
                title: "Ticket",
                message: "Generando ticket...",
                color: "blue",
              });
            }}
          >
            Generar ticket
          </Button>
          <Group grow>
            <Button
              variant="outline"
              color="orange"
              style={{ opacity: 0.5 }}
              onClick={handleDeleteClick}
            >
              {deleteConfirm
                ? `Confirmar (${deleteCountdown})`
                : "Cancelar turno"}
            </Button>
            <Button style={{ opacity: 0.75 }} onClick={handleUpdateAppointment}>
              Confirmar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={clientModalOpened}
        onClose={closeClientModal}
        title="Nuevo Cliente"
        zIndex={1100}
      >
        <Stack>
          <TextInput
            label="Nombre"
            required
            placeholder="Nombre del cliente"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
          />
          <TextInput
            label="Teléfono"
            placeholder="Teléfono del cliente"
            value={newClientPhone}
            onChange={(e) => setNewClientPhone(e.target.value)}
          />
          <TextInput
            label="Email"
            placeholder="Email del cliente"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
          />
          <Button
            fullWidth
            style={{ opacity: 0.5 }}
            onClick={handleCreateClient}
          >
            Crear Cliente
          </Button>
        </Stack>
      </Modal>
    </Box>
  );
}
