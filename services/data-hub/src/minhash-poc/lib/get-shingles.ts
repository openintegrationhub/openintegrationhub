export default (words: string[], shingleSize = 3): string[] => {
    const text = words.join("")
    const shingles: string[] = []
    for (let i = 0; i < text.length; i++) {
        if (i + shingleSize > text.length) break
        const shingle: string = text.substring(i, i + shingleSize)
        if (!shingles.includes(shingle)) shingles.push(shingle)
    }
    return shingles
}
