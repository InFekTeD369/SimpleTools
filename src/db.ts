import Dexie, { type Table } from 'dexie';

export interface Notebook {
  id?: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id?: number;
  notebookId: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HtmlProject {
  id?: number;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Drawing {
  id?: number;
  name: string;
  dataUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SimpleToolsDB extends Dexie {
  notebooks!: Table<Notebook>;
  pages!: Table<Page>;
  htmlProjects!: Table<HtmlProject>;
  drawings!: Table<Drawing>;

  constructor() {
    super('SimpleToolsDB');
    this.version(3).stores({
      notebooks: '++id, name',
      pages: '++id, notebookId, title',
      htmlProjects: '++id, name, updatedAt',
      drawings: '++id, name, updatedAt'
    });
  }
}

export const db = new SimpleToolsDB();

