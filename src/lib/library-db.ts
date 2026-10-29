export type Book = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
};

const DB = "lumen-library";
const STORE = "books";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listBooks(): Promise<Book[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).getAll();
  const rows = await new Promise<Book[]>((resolve, reject) => {
    request.onsuccess = () => resolve((request.result as Book[]) ?? []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveBook(book: Book) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(book);
  await txDone(tx);
  db.close();
}

export async function deleteBook(id: string) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

export const SAMPLE_BOOK: Book = {
  id: "amostra-casmurro",
  title: "Dom Casmurro — abertura",
  createdAt: 1,
  text: `Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéu. Cumprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos pode ser que não fossem inteiramente maus. Sucedeu, porém, que, como eu estava cansado, fechei os olhos três ou quatro vezes; tanto bastou para que ele interrompesse a leitura e metesse os versos no bolso.

Continue, disse eu acordando. Já acabei, murmurou ele. São muito bonitos. Vi-lhe fazer um gesto para tirá-los outra vez do bolso, mas não passou do gesto. Ora, por que recitar versos a um homem que vai dormir? Há nisso uma falta de método, ou de cortesia, ou de ambas as coisas.

O que eu quero contar é como cheguei à idéia de escrever este livro. A idéia veio de um retrato e de uma promessa antiga. Prometi a mim mesmo reunir, com alguma ordem, os fatos da minha vida que ainda me pesam, sem enfeite e sem pressa. Não é um tratado. É uma memória que pede leitura em voz alta, de preferência numa tarde quieta.

Há capítulos que parecem miúdos e são os que importam: o muro do quintal, a missa de domingo, uma frase dita à porta e outra engolida no corredor. Quem estuda uma apostila às pressas perde esses fios. Quem os ouve devagar entende o nó. Se você chegou até aqui para adiantar a leitura, comece pelo que se repete. O que se repete é o tema. O resto é cenário.

Machado escrevia como quem conversa e, no meio da conversa, deixa uma agulha. O resumo honesto desta abertura é simples: um narrador cansado recebe versos num trem, cala o poeta sem querer e decide, mais tarde, pôr a própria vida em ordem num livro. O método que ele sugere serve para qualquer apostila: marcar o que volta, ignorar o ornamento e só então pedir que alguém leia em voz alta.`,
};
