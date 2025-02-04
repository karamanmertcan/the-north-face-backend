export function generateUsername(firstName: string, lastName: string, email: string): string {
    // İsim ve soyisimi küçük harfe çevir ve türkçe karakterleri değiştir
    const normalizedFirstName = firstName
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');

    const normalizedLastName = lastName
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');

    // Email'in @ işaretinden önceki kısmını al
    const emailPrefix = email.split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    // Random sayı üret (100-999 arası)
    const randomNum = Math.floor(Math.random() * 900 + 100);

    // Username alternatifleri oluştur
    const options = [
        `${normalizedFirstName}${normalizedLastName}`,
        `${normalizedFirstName}.${normalizedLastName}`,
        `${normalizedFirstName}${normalizedLastName}${randomNum}`,
        `${normalizedFirstName[0]}${normalizedLastName}`,
        `${emailPrefix}${randomNum}`,
        `${normalizedFirstName}${randomNum}`,
        `${normalizedFirstName[0]}${normalizedLastName}${randomNum}`
    ];

    // Rastgele bir seçenek döndür
    return options[Math.floor(Math.random() * options.length)];
}