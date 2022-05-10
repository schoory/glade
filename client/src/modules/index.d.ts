import { ReactNode } from "react";


/**
 * Заменяет вхождения в строку на элементы JSX согласно условию
 * 
 * @param line Исходная строка
 * @param separators Массив условий, может содержать строки и регулярные выражения
 * @param callback Рендер элемента JSX
 * @returns Массив элементов JSX
 */
export declare const replaceWithComponent: (line: String, separators: Array<String | RegExp>, callback: Function) => Array<ReactNode>
