import type {
  AzBooking,
  AzGuest,
  AzHousekeepingTask,
  AzReportData,
  AzRoom
} from "./models";

export function createAzHotelCoreSeeds(propertyId: string) {
  const guests: Array<AzGuest & { propertyId: string }> = [
    {
      propertyId,
      id: "az_guest_demo_anna",
      name: "Anna Petrova",
      contact: {
        phone: "+79990000001",
        email: "anna@example.com"
      },
      history: ["az_booking_demo_anna"]
    },
    {
      propertyId,
      id: "az_guest_demo_sergey",
      name: "Sergey Ivanov",
      contact: {
        phone: "+79990000002",
        email: "sergey@example.com"
      },
      history: ["az_booking_demo_sergey"]
    }
  ];

  const rooms: Array<AzRoom & { propertyId: string }> = [
    {
      propertyId,
      id: "az_room_101",
      type: "standard",
      number: "101",
      priceRules: [
        {
          id: "weekday_standard",
          title: "Будний день",
          daysOfWeek: [1, 2, 3, 4],
          multiplier: 1
        },
        {
          id: "weekend_standard",
          title: "Выходной день",
          daysOfWeek: [5, 6],
          multiplier: 1.15
        }
      ],
      status: "clean"
    },
    {
      propertyId,
      id: "az_room_203",
      type: "double",
      number: "203",
      priceRules: [
        {
          id: "base_double",
          title: "Базовый тариф",
          daysOfWeek: [],
          multiplier: 1
        }
      ],
      status: "dirty"
    }
  ];

  const bookings: Array<AzBooking & { propertyId: string }> = [
    {
      propertyId,
      id: "az_booking_demo_anna",
      guestId: "az_guest_demo_anna",
      roomId: "az_room_203",
      dates: {
        checkIn: "2026-03-25",
        checkOut: "2026-03-28"
      },
      status: "confirmed",
      services: [
        {
          id: "az_service_breakfast_anna",
          name: "Завтрак",
          quantity: 2,
          price: 450,
          total: 900
        }
      ],
      total: 12900,
      channel: "phone"
    },
    {
      propertyId,
      id: "az_booking_demo_sergey",
      guestId: "az_guest_demo_sergey",
      roomId: "az_room_101",
      dates: {
        checkIn: "2026-03-26",
        checkOut: "2026-03-29"
      },
      status: "draft",
      services: [],
      total: 9600,
      channel: "whatsapp"
    }
  ];

  const housekeepingTasks: Array<AzHousekeepingTask & { propertyId: string }> = [
    {
      propertyId,
      id: "az_hk_203_20260325",
      roomId: "az_room_203",
      date: "2026-03-25",
      status: "queued",
      assignee: "Olga Housekeeping"
    }
  ];

  const reportData: Array<AzReportData & { propertyId: string }> = [
    {
      propertyId,
      id: "az_report_20260325",
      date: "2026-03-25",
      occupancyRate: 50,
      revenue: 12900,
      bookings: 2,
      adr: 6450,
      channels: [
        {
          channel: "phone",
          bookings: 1,
          revenue: 12900
        },
        {
          channel: "whatsapp",
          bookings: 1,
          revenue: 9600
        }
      ]
    }
  ];

  return {
    guests,
    rooms,
    bookings,
    housekeepingTasks,
    reportData
  };
}
