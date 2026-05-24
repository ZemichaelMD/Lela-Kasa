import type { SdkClient, RequestOptions } from '../client';

export interface PermissionGroup {
  group: string;
  permissions: Array<{
    slug: string;
    label: string;
    description: string;
    granted: boolean;
  }>;
}

export interface UpdatePermissionsDto {
  updates: Array<{ slug: string; granted: boolean }>;
}

export class PermissionsResource {
  constructor(private readonly client: SdkClient) {}

  me(options?: RequestOptions): Promise<{ granted: string[] }> {
    return this.client.get<{ granted: string[] }>('/api/v1/permissions/me', options);
  }

  getEmployee(employeeId: string, options?: RequestOptions): Promise<PermissionGroup[]> {
    return this.client.get<PermissionGroup[]>(`/api/v1/permissions/employees/${employeeId}`, options);
  }

  updateEmployee(employeeId: string, dto: UpdatePermissionsDto, options?: RequestOptions): Promise<PermissionGroup[]> {
    return this.client.patch<PermissionGroup[]>(`/api/v1/permissions/employees/${employeeId}`, dto, options);
  }
}
