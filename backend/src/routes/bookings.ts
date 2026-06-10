import { Router, Response, Request } from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import cloudinary from "../lib/cloudinary.js";
import { sendBookingNotificationEmail } from "../lib/email.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const getId = (id: string | string[] | undefined): string => {
  if (Array.isArray(id)) return id[0];
  return id || "";
};

// Get all booking profiles for user
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profiles = await (prisma as any).bookingProfile.findMany({
      where: {
        userId: req.userId
      },
      include: {
        pictures: true,
        unavailableDates: true,
        business: {
          select: {
            id: true,
            name: true,
            website: true
          }
        },
        _count: {
          select: {
            bookings: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Map to include bookingsCount for frontend
    const profilesWithCount = profiles.map((p: any) => ({
      ...p,
      bookingsCount: p._count.bookings
    }));

    res.json({ profiles: profilesWithCount });
  } catch (error) {
    console.error("Get booking profiles error:", error);
    res.status(500).json({ error: "Failed to get booking profiles" });
  }
});

// Get a specific booking profile (owner only)
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = getId(req.params.id);
    const profile = await prisma.bookingProfile.findFirst({
      where: {
        id,
        userId: req.userId
      },
      include: {
        pictures: true,
        unavailableDates: true
      }
    });
    if (!profile) {
      return res.status(404).json({ error: "Booking profile not found" });
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to get booking profile" });
  }
});

// Get public booking profile by publicId
router.get("/public/:publicId", async (req: Request, res: Response) => {
  try {
    const publicId = getId(req.params.publicId);
    const profile = await (prisma as any).bookingProfile.findUnique({
      where: { publicId },
      include: {
        pictures: true,
        unavailableDates: true,
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        business: {
          select: {
            id: true,
            name: true,
            website: true
          }
        }
      }
    });
    if (!profile) {
      return res.status(404).json({ error: "Booking profile not found" });
    }
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to get booking profile" });
  }
});

// Create a booking profile
router.post(
  "/",
  authenticate,
  [
    body("name").trim().notEmpty().withMessage("Business name is required"),
    body("location").trim().notEmpty().withMessage("Location is required"),
    body("description").optional().trim(),
    body("services").optional().isArray(),
    body("businessId").optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, location, description, services, businessId } = req.body;

      const profile = await prisma.bookingProfile.create({
        data: {
          userId: req.userId,
          name,
          location,
          description: description || null,
          services: services || [],
          businessId: businessId || null,
        }
      });

      res.status(201).json({ profile });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to create booking profile",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// Update a booking profile
router.put(
  "/:id",
  authenticate,
  [
    body("name").optional().trim().notEmpty(),
    body("location").optional().trim().notEmpty(),
    body("description").optional().trim(),
    body("services").optional().isArray(),
    body("businessId").optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const id = getId(req.params.id);
      const { name, location, description, services, businessId } = req.body;

      const existing = await prisma.bookingProfile.findFirst({
        where: {
          id,
          userId: req.userId
        }
      });

      if (!existing) {
        return res.status(404).json({ error: "Booking profile not found" });
      }

      const profile = await prisma.bookingProfile.update({
        where: { id },
        data: {
          name: name !== undefined ? name : existing.name,
          location: location !== undefined ? location : existing.location,
          description: description !== undefined ? description : existing.description,
          services: services !== undefined ? services : existing.services,
          businessId: businessId !== undefined ? businessId : existing.businessId,
        }
      });

      res.json({ profile });
    } catch (error) {
      res.status(500).json({ error: "Failed to update booking profile" });
    }
  }
);

// Upload images for a booking profile
router.post("/:id/pictures", authenticate, upload.array('images', 10), async (req: AuthRequest, res: Response) => {
  try {
    const id = getId(req.params.id);
    
    const existing = await prisma.bookingProfile.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking profile not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedPictures = [];

    for (const file of files) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'bookings' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      const picture = await prisma.bookingPicture.create({
        data: {
          bookingProfileId: id,
          imageUrl: (uploadResult as any).secure_url,
          publicId: (uploadResult as any).public_id
        }
      });
      uploadedPictures.push(picture);
    }

    res.json({ pictures: uploadedPictures });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload pictures" });
  }
});

// Delete a picture
router.delete("/pictures/:pictureId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pictureId = getId(req.params.pictureId);

    const picture = await prisma.bookingPicture.findUnique({
      where: { id: pictureId },
      include: {
        bookingProfile: true
      }
    });

    if (!picture) {
      return res.status(404).json({ error: "Picture not found" });
    }

    if (picture.bookingProfile?.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (picture.publicId) {
      await cloudinary.uploader.destroy(picture.publicId);
    }

    await prisma.bookingPicture.delete({ where: { id: pictureId } });

    res.json({ message: "Picture deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete picture" });
  }
});

// Add unavailable dates
router.post("/:id/unavailable-dates", authenticate, [
  body("dates").isArray().withMessage("Dates must be an array"),
], async (req: AuthRequest, res: Response) => {
  try {
    const id = getId(req.params.id);
    const { dates, replace } = req.body;

    const existing = await prisma.bookingProfile.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking profile not found" });
    }

    // If replace is true, delete all existing unavailable dates for this profile
    if (replace) {
      await prisma.unavailableDate.deleteMany({
        where: {
          bookingProfileId: id
        }
      });
    }

    const unavailableDates = await Promise.all(
      dates.map((item: any) => {
        const dateStr = typeof item === 'string' ? item : item.date;
        const startTime = typeof item === 'object' ? item.startTime : null;
        const endTime = typeof item === 'object' ? item.endTime : null;
        
        return prisma.unavailableDate.create({
          data: {
            bookingProfileId: id,
            date: new Date(dateStr),
            startTime,
            endTime
          }
        });
      })
    );

    res.json({ dates: unavailableDates });
  } catch (error) {
    console.error("Add unavailable dates error:", error);
    res.status(500).json({ error: "Failed to add unavailable dates" });
  }
});

// Remove an unavailable date
router.delete("/unavailable-dates/:dateId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dateId = getId(req.params.dateId);

    const dateRecord = await prisma.unavailableDate.findUnique({
      where: { id: dateId },
      include: {
        bookingProfile: true
      }
    });

    if (!dateRecord) {
      return res.status(404).json({ error: "Date not found" });
    }

    if (dateRecord.bookingProfile?.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.unavailableDate.delete({ where: { id: dateId } });

    res.json({ message: "Date removed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove date" });
  }
});

// Get unavailable dates for public view
router.get("/public/:publicId/unavailable-dates", async (req: Request, res: Response) => {
  try {
    const publicId = getId(req.params.publicId);
    
    // Get profile to get its ID
    const profile = await prisma.bookingProfile.findUnique({
      where: { publicId },
      select: { id: true }
    });

    if (!profile) {
      return res.status(404).json({ error: "Booking profile not found" });
    }

    // Get both manually blocked dates and already booked dates
    const [unavailableDates, bookings] = await Promise.all([
      prisma.unavailableDate.findMany({
        where: { bookingProfileId: profile.id },
        select: { date: true, startTime: true, endTime: true }
      }),
      prisma.booking.findMany({
        where: { bookingProfileId: profile.id },
        select: { date: true, time: true }
      })
    ]);

    const result = {
      unavailableDates: unavailableDates.map(d => ({
        date: d.date.toISOString().split('T')[0],
        startTime: d.startTime,
        endTime: d.endTime
      })),
      bookings: bookings.map(b => ({
        date: b.date.toISOString().split('T')[0],
        time: b.time
      }))
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to get unavailable dates" });
  }
});

// Create a booking (public endpoint)
router.post(
  "/create",
  [
    body("bookingProfileId").isString().notEmpty().withMessage("Profile ID is required"),
    body("date").isString().notEmpty().withMessage("Valid date is required"),
    body("time").optional().isString(),
    body("customerName").trim().notEmpty().withMessage("Customer name is required"),
    body("customerPhone").trim().notEmpty().withMessage("Customer phone is required"),
    body("notes").optional().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      console.log("Booking creation request received:", req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.warn("Booking validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { bookingProfileId, date, time, customerName, customerPhone, notes } = req.body;
      
      // Ensure date is treated as a UTC date at midnight to avoid timezone issues
      const bookingDate = new Date(date);
      bookingDate.setUTCHours(0, 0, 0, 0);

      // Verify the booking profile exists and include user details
      console.log(`Fetching profile ${bookingProfileId} and host user...`);
      const profile = await prisma.bookingProfile.findUnique({
        where: { id: bookingProfileId },
        include: {
          user: true
        }
      });

      if (!profile) {
        console.error(`Booking profile ${bookingProfileId} not found`);
        return res.status(404).json({ error: "Booking profile not found" });
      }

      console.log(`Found profile: ${profile.name}, Host User: ${profile.user?.email || "NOT FOUND"}`);

      // Check if the date is unavailable (manually blocked for the whole day)
      const unavailableDate = await prisma.unavailableDate.findFirst({
        where: {
          bookingProfileId: bookingProfileId,
          date: bookingDate,
          startTime: null,
          endTime: null
        }
      });

      if (unavailableDate) {
        console.warn(`Booking failed: Date ${date} is unavailable`);
        return res.status(400).json({ error: "Selected date is unavailable" });
      }

      // Check if there's already a booking for this profile on this date/time
      const existingBooking = await prisma.booking.findFirst({
        where: {
          bookingProfileId: bookingProfileId,
          date: bookingDate,
          time: time || null
        }
      });

      if (existingBooking) {
        console.warn(`Booking failed: Time slot ${time || 'full-day'} on ${date} is already booked`);
        return res.status(400).json({ error: "Selected time slot is already booked" });
      }

      console.log("Creating booking in database...");
      const booking = await prisma.booking.create({
        data: {
          bookingProfileId: bookingProfileId,
          date: bookingDate,
          time: time || null,
          customerName,
          customerPhone,
          notes: notes || null,
        }
      });
      console.log("Booking created successfully:", booking.id);

      // Send email notification to host (non-blocking)
      if (profile.user && profile.user.email) {
        console.log(`Triggering host notification email to ${profile.user.email}...`);
        sendBookingNotificationEmail(
          profile.user.email,
          profile.user.fullName,
          {
            bookingProfileName: profile.name,
            customerName,
            customerPhone,
            date: bookingDate.toISOString().split('T')[0],
            time: time || undefined,
            notes: notes || undefined
          }
        ).then(() => {
          console.log(`Async: Host notification email process completed for ${profile.user.email}`);
        }).catch(err => {
          console.error(`Async ERROR: Failed to send host notification email to ${profile.user.email}:`, err);
        });
      } else {
        console.warn("Skipping email: Host user or email not found in profile record.");
      }

      res.status(201).json({ booking });
    } catch (error) {
      console.error("CRITICAL ERROR in booking creation route:", error);
      res.status(500).json({ 
        error: "Failed to create booking",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
);

// Get bookings for a profile (for host dashboard)
router.get("/profile/:profileId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profileId = getId(req.params.profileId);

    // Verify the profile belongs to the user
    const profile = await prisma.bookingProfile.findFirst({
      where: {
        id: profileId,
        userId: req.userId
      }
    });

    if (!profile) {
      return res.status(404).json({ error: "Booking profile not found" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        bookingProfileId: profileId
      },
      include: {
        bookingProfile: {
          select: {
            name: true,
            publicId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Delete a booking profile
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = getId(req.params.id);

    const existing = await prisma.bookingProfile.findFirst({
      where: {
        id,
        userId: req.userId
      }
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking profile not found" });
    }

    await prisma.bookingProfile.delete({ where: { id } });

    res.json({ message: "Booking profile deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete booking profile" });
  }
});

// Get all bookings for all profiles belonging to the user
router.get("/all-bookings", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        bookingProfile: {
          userId: req.userId
        }
      },
      include: {
        bookingProfile: {
          select: {
            name: true,
            publicId: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.json({ bookings });
  } catch (error) {
    console.error("Get all bookings error:", error);
    res.status(500).json({ error: "Failed to get bookings" });
  }
});

// Delete a booking (appointment)
router.delete("/appointments/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = getId(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingProfile: true
      }
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.bookingProfile?.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.booking.delete({ where: { id } });

    res.json({ message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

export default router;