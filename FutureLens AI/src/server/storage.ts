type StorageClient = {
  from: (bucket: string) => {
    upload: (
      path: string,
      data: Uint8Array,
      options: { contentType: string; upsert: boolean },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export async function storeGeneratedImage(
  storage: StorageClient,
  bucket: string,
  key: string,
  image: Uint8Array,
): Promise<void> {
  const { error } = await storage.from(bucket).upload(key, image, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Unable to store generated concept: ${error.message}`);
}
