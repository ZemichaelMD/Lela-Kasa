import type { SdkClient, RequestOptions } from '../client';

export interface Employee {
  id: string;
  shopId: string;
  name: string;
  email: string;
  username?: string;
  hasPin: boolean;
  role: string;
  isActive: boolean;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeeDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateEmployeeDto {
  name?: string;
  phone?: string | null;
  isActive?: boolean;
  username?: string;
  pin?: string;
}

export class EmployeesResource {
  constructor(private readonly client: SdkClient) {}

  list(options?: RequestOptions): Promise<Employee[]> {
    return this.client.get<Employee[]>('/api/v1/users', options);
  }

  create(dto: CreateEmployeeDto, options?: RequestOptions): Promise<Employee> {
    return this.client.post<Employee>('/api/v1/users', dto, options);
  }

  update(id: string, dto: UpdateEmployeeDto, options?: RequestOptions): Promise<Employee> {
    return this.client.patch<Employee>(`/api/v1/users/${id}`, dto, options);
  }

  delete(id: string, options?: RequestOptions): Promise<void> {
    return this.client.delete<void>(`/api/v1/users/${id}`, options);
  }
}
