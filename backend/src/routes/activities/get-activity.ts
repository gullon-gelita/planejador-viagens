import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import nodemailer from "nodemailer";
import { z } from "zod";
import { dayjs } from "../../lib/dayjs";
import { getMailClient } from "../../lib/mail";
import { prisma } from "../../lib/prisma";

export async function getActivities(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    "/trip/:tripId/activities",
    {
      schema: {
        params: z.object({ tripId: z.string().uuid() }),
      },
    },
    async (request) => {
      const { tripId } = request.params;

      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          activities: { orderBy: { occurs_at: "asc" } },
        },
      });

      if (!trip) throw new Error("Trip not found");

      const tripsLenghtInDays = dayjs(trip.ends_at).diff(
        trip.starts_at,
        "days"
      );

      const activities = Array.from({ length: tripsLenghtInDays + 1 }).map(
        (_, idx) => {
          const date = dayjs(trip.starts_at).add(idx, "days");
          return {
            date: date.toDate(),
            activities: trip.activities.filter((activity) => {
              return dayjs(activity.occurs_at).isSame(date, "day");
            }),
          };
        }
      );

      return { activities };
    }
  );
}