import type { SdkClient, RequestOptions } from '../client';

export interface Employee {
  id: string;
  shopId: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'OWNER' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
}

export interface InviteEmployeeDto {
  email: string;
  name: string;
  phone?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  phone?: string;
  isActive?: boolean;
}

export class EmployeesResource {
  constructor(private readonly client: SdkClient) {}

  list(options?: RequestOptions): Promise<Employee[]> {
    return this.client.get<Employee[]>('/api/v1/users', options);
  }

  invite(dto: InviteEmployeeDto, options?: RequestOptions): Promise<Employee> {
    return this.client.post<Employee>('/api/v1/users/invite', dto, options);
  }

  update(id: string, dto: UpdateEmployeeDto, options?: RequestOptions): Promise<Employee> {
    return this.client.patch<Employee>(`/api/v1/users/${id}`, dto, options);
  }

  remove(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/users/${id}`, options);
  }
}
