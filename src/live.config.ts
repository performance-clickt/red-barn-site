/// <reference types="emdash/locals" />
import { defineLiveCollection } from 'astro:content';
import { emdashLoader } from 'emdash/runtime';
export const collections={_emdash:defineLiveCollection({loader:emdashLoader()})};
