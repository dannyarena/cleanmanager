import { prisma } from '../lib/prisma';

/**
 * Servizio per validazioni same-tenant nelle transazioni
 * Impedisce connect incrociati tra entità di tenant diversi
 */
export class TenantValidationService {
  
  /**
   * Valida che tutti gli ID forniti appartengano allo stesso tenant
   */
  static async validateSameTenant(
    tenantId: string,
    validations: Array<{
      model: string;
      id: string;
      field?: string;
    }>
  ): Promise<void> {
    for (const validation of validations) {
      const exists = await this.checkEntityExists(tenantId, validation.model, validation.id);
      if (!exists) {
        throw new Error(`Cross-tenant reference blocked: ${validation.model} ${validation.id} not found in tenant ${tenantId}`);
      }
    }
  }

  /**
   * Verifica che un'entità esista nel tenant specificato
   */
  private static async checkEntityExists(
    tenantId: string,
    model: string,
    id: string
  ): Promise<boolean> {
    const modelName = model.toLowerCase();
    
    try {
      let result;
      
      switch (modelName) {
        case 'shift':
          result = await prisma.shift.findFirst({
            where: { id, tenantId }
          });
          break;
          
        case 'user':
          result = await prisma.user.findFirst({
            where: { id, tenantId }
          });
          break;
          
        case 'site':
          result = await prisma.site.findFirst({
            where: { id, tenantId }
          });
          break;
          
        case 'client':
          result = await prisma.client.findFirst({
            where: { id, tenantId }
          });
          break;
          
        case 'checklist':
          result = await prisma.checklist.findFirst({
            where: { id, tenantId }
          });
          break;
          
        default:
          throw new Error(`Unsupported model for tenant validation: ${model}`);
      }
      
      return result !== null;
    } catch (error) {
      console.error(`Error validating ${model} ${id} in tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Wrapper per creare ShiftOperator con validazione same-tenant
   */
  static async createShiftOperator(
    tenantId: string,
    shiftId: string,
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Valida che shift e user appartengano allo stesso tenant
      await this.validateSameTenant(tenantId, [
        { model: 'Shift', id: shiftId },
        { model: 'User', id: userId }
      ]);

      return tx.shiftOperator.create({
        data: {
          shiftId,
          userId,
          tenantId
        }
      });
    });
  }

  /**
   * Wrapper per creare ShiftSite con validazione same-tenant
   */
  static async createShiftSite(
    tenantId: string,
    shiftId: string,
    siteId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Valida che shift e site appartengano allo stesso tenant
      await this.validateSameTenant(tenantId, [
        { model: 'Shift', id: shiftId },
        { model: 'Site', id: siteId }
      ]);

      return tx.shiftSite.create({
        data: {
          shiftId,
          siteId,
          tenantId
        }
      });
    });
  }

  /**
   * Wrapper per creare CheckItem con validazione same-tenant
   */
  static async createCheckItem(
    tenantId: string,
    checklistId: string,
    data: {
      title: string;
      description?: string;
      order: number;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Valida che la checklist appartenga allo stesso tenant
      await this.validateSameTenant(tenantId, [
        { model: 'Checklist', id: checklistId }
      ]);

      return tx.checkItem.create({
        data: {
          ...data,
          checklistId,
          tenantId
        }
      });
    });
  }

  /**
   * Wrapper per creare ShiftException con validazione same-tenant
   */
  static async createShiftException(
    tenantId: string,
    shiftId: string,
    data: {
      exceptionDate: Date;
      type: 'SKIP' | 'MODIFY';
      title?: string;
      notes?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Valida che il shift appartenga allo stesso tenant
      await this.validateSameTenant(tenantId, [
        { model: 'Shift', id: shiftId }
      ]);

      return tx.shiftException.create({
        data: {
          ...data,
          shiftId,
          tenantId
        }
      });
    });
  }

  /**
   * Wrapper generico per operazioni batch con validazione same-tenant
   */
  static async createMultipleWithValidation<T>(
    tenantId: string,
    operations: Array<{
      model: string;
      data: any;
      validations: Array<{ model: string; id: string }>;
    }>
  ): Promise<T[]> {
    return await prisma.$transaction(async (tx) => {
      const results: T[] = [];
      
      for (const operation of operations) {
        // Valida tutti gli ID per questa operazione
        await this.validateSameTenant(tenantId, operation.validations);
        
        // Esegui l'operazione (questo richiederà un'implementazione più specifica)
        // Per ora lanciamo un errore per indicare che serve implementazione
        throw new Error(`Batch operation for ${operation.model} not yet implemented`);
      }
      
      return results;
    });
  }
}

export default TenantValidationService;