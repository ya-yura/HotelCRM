import type {
  AzBookingStatus,
  AzHousekeepingDashboard,
  AzHousekeepingTask,
  AzHousekeepingTaskStatus,
  AzHousekeepingTaskView
} from "@hotel-crm/shared/features/azhotel_core";
import { getHotelData, updateHotelData } from "./dataStore";

function isOpenBookingStatus(status: AzBookingStatus) {
  return ["confirmed", "checked_in"].includes(status);
}

async function buildTaskView(propertyId: string, task: AzHousekeepingTask & { propertyId: string }): Promise<AzHousekeepingTaskView> {
  const data = await getHotelData();
  const room = data.azRooms.find((entry) => entry.propertyId === propertyId && entry.id === task.roomId);
  const booking = room
    ? data.azBookings.find(
        (entry) =>
          entry.propertyId === propertyId &&
          entry.roomId === room.id &&
          isOpenBookingStatus(entry.status)
      )
    : null;
  const guest = booking
    ? data.azGuests.find((entry) => entry.propertyId === propertyId && entry.id === booking.guestId)
    : null;

  return {
    ...task,
    roomNumber: room?.number ?? "—",
    roomType: room?.type ?? "",
    roomStatus: room?.status ?? "dirty",
    bookingId: booking?.id,
    guestName: guest?.name,
    bookingStatus: booking?.status
  };
}

async function ensureDirtyRoomsHaveTasks(propertyId: string) {
  await updateHotelData(async (data) => {
    const today = new Date().toISOString().slice(0, 10);
    const dirtyRooms = data.azRooms.filter(
      (room) => room.propertyId === propertyId && room.status === "dirty"
    );

    for (const room of dirtyRooms) {
      const existing = data.azHousekeepingTasks.find(
        (task) =>
          task.propertyId === propertyId &&
          task.roomId === room.id &&
          task.status !== "done" &&
          task.status !== "skipped"
      );
      if (!existing) {
        data.azHousekeepingTasks.unshift({
          propertyId,
          id: `az_hk_${room.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          roomId: room.id,
          date: today,
          status: "queued",
          assignee: ""
        });
      }
    }
  });
}

export async function listAzHousekeepingTasks(propertyId: string, assigneeFilter?: string) {
  await ensureDirtyRoomsHaveTasks(propertyId);
  const tasks = (await getHotelData()).azHousekeepingTasks
    .filter((task) => task.propertyId === propertyId)
    .filter((task) => (!assigneeFilter ? true : task.assignee === assigneeFilter))
    .sort((left, right) => right.date.localeCompare(left.date));

  return Promise.all(tasks.map((task) => buildTaskView(propertyId, task)));
}

export async function getAzHousekeepingDashboard(propertyId: string, assigneeFilter?: string): Promise<AzHousekeepingDashboard> {
  const tasks = await listAzHousekeepingTasks(propertyId, assigneeFilter);
  const rooms = (await getHotelData()).azRooms.filter((room) => room.propertyId === propertyId);

  return {
    totalTasks: tasks.length,
    queuedTasks: tasks.filter((task) => task.status === "queued").length,
    inProgressTasks: tasks.filter((task) => task.status === "in_progress").length,
    doneTasks: tasks.filter((task) => task.status === "done").length,
    dirtyRooms: assigneeFilter
      ? tasks.filter((task) => task.roomStatus === "dirty").length
      : rooms.filter((room) => room.status === "dirty").length,
    occupiedRooms: assigneeFilter
      ? tasks.filter((task) => task.roomStatus === "occupied").length
      : rooms.filter((room) => room.status === "occupied").length,
    unassignedTasks: tasks.filter((task) => !task.assignee).length
  };
}

export async function updateAzHousekeepingTask(
  propertyId: string,
  taskId: string,
  patch: { status?: AzHousekeepingTaskStatus; assignee?: string }
) {
  const updated = await updateHotelData(async (data) => {
    const index = data.azHousekeepingTasks.findIndex(
      (task) => task.propertyId === propertyId && task.id === taskId
    );
    if (index === -1) {
      return null;
    }

    const currentTask = data.azHousekeepingTasks[index];
    data.azHousekeepingTasks[index] = {
      ...currentTask,
      ...(typeof patch.status === "string" ? { status: patch.status } : {}),
      ...(typeof patch.assignee === "string" ? { assignee: patch.assignee } : {})
    };

    const roomIndex = data.azRooms.findIndex(
      (room) => room.propertyId === propertyId && room.id === currentTask.roomId
    );
    if (roomIndex >= 0) {
      if (patch.status === "done") {
        data.azRooms[roomIndex] = {
          ...data.azRooms[roomIndex],
          status: "clean"
        };
      } else if (patch.status === "in_progress" || patch.status === "queued" || patch.status === "skipped") {
        data.azRooms[roomIndex] = {
          ...data.azRooms[roomIndex],
          status: "dirty"
        };
      }
    }

    return data.azHousekeepingTasks[index];
  });

  return updated ? buildTaskView(propertyId, updated) : null;
}
