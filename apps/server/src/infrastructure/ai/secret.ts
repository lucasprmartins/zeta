// Separação de finalidade: a chave AES é derivada para esta configuração apenas.
export async function secretCipher(secret: string) {
  const encoder = new TextEncoder();
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "HKDF",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("console.help"),
      info: encoder.encode("openai-api-key:v1"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  return {
    async encrypt(value: string) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encoder.encode(value)
      );
      return `v1.${Buffer.from(iv).toString("base64")}.${Buffer.from(ciphertext).toString("base64")}`;
    },
    async decrypt(value: string) {
      const [version, iv, ciphertext] = value.split(".");
      if (version !== "v1" || !iv || !ciphertext) {
        throw new Error("Configuração da ajuda inválida.");
      }
      return new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
          key,
          Buffer.from(ciphertext, "base64")
        )
      );
    },
  };
}
