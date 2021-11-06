export type DbReadOnly = 'id' | 'dateAdded' | 'dateUpdated';

export type DatabaseItem = {
  id: number;
  dateAdded: string;
  dateUpdated: string;
};

export type DbChangeEvent<T> = {
  id: number;
  changeType: 'add' | 'update' | 'delete';
  updatedItem: T;
};
