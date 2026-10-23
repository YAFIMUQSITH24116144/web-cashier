import { Capacitor } from '@capacitor/core';
import { getDatabase } from './database';

export interface Employee {
  id: string;
  name: string;
}

export async function loadEmployeesFromDatabase(): Promise<Employee[]> {
  if (Capacitor.getPlatform() !== 'android') {
    return [];
  }

  const db = await getDatabase();

  const result = await db.query(`
    SELECT id, name
    FROM employees
    ORDER BY name ASC
  `);

  return (result.values ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name ?? ''),
  }));
}

export async function saveEmployeeToDatabase(
  employee: Employee
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  await db.run(
    `
      INSERT INTO employees (id, name)
      VALUES (?, ?)
    `,
    [employee.id, employee.name.trim()]
  );
}

export async function deleteEmployeeFromDatabase(
  employeeId: string
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    return;
  }

  const db = await getDatabase();

  await db.run(
    `
      DELETE FROM employees
      WHERE id = ?
    `,
    [employeeId]
  );
}