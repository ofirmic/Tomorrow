import { prisma } from './prisma-client.js';
import type { IAlertRepository, CreateAlertInput, AlertRecord } from '../../business-logic/ports/alert-repository.js';

export class PrismaAlertRepository implements IAlertRepository {
  async createAlert(input: CreateAlertInput): Promise<AlertRecord> {
    const alert = await prisma.alert.create({
      data: {
        name: input.name ?? null,
        description: input.description ?? null,
        cityName: input.cityName ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        parameter: input.parameter as any,
        operator: input.operator as any,
        threshold: input.threshold,
        units: input.units ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
      },
    });
    return alert as unknown as AlertRecord;
  }

  async listAlerts(): Promise<AlertRecord[]> {
    const alerts = await prisma.alert.findMany({ orderBy: { createdAt: 'desc' } });
    return alerts as unknown as AlertRecord[];
  }

  async getAllAlerts(): Promise<AlertRecord[]> {
    const alerts = await prisma.alert.findMany();
    return alerts as unknown as AlertRecord[];
  }

  async listAlertsPaginated(page: number, pageSize: number): Promise<{ items: AlertRecord[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.alert.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        // Projection for bandwidth and performance
        select: {
          id: true, name: true, description: true, cityName: true,
          latitude: true, longitude: true,
          parameter: true, operator: true, threshold: true, units: true,
          contactEmail: true, contactPhone: true,
          createdAt: true, updatedAt: true,
          lastValue: true, lastState: true, lastEvaluatedAt: true,
        },
      }) as unknown as Promise<AlertRecord[]>,
      prisma.alert.count(),
    ]);
    return { items: items as unknown as AlertRecord[], total };
  }

  async updateAlertAfterEvaluation(
    alertId: string,
    update: { currentValue: number | null; triggered: boolean; createHistory?: boolean }
  ): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        lastValue: update.currentValue,
        lastState: update.triggered,
        lastEvaluatedAt: new Date(),
        ...(!update.createHistory || update.currentValue == null
          ? {}
          : {
              evaluations: {
                create: {
                  triggered: update.triggered,
                  value: update.currentValue,
                },
              },
            }),
      },
    });
  }

  async deleteAlert(id: string): Promise<void> {
    await prisma.alert.delete({ where: { id } });
  }

  async deleteAllAlerts(): Promise<{ count: number }> {
    const result = await prisma.alert.deleteMany({});
    return { count: result.count };
  }
}


