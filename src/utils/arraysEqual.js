export default function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) {
        return false
    }
    if (!(a.length === b.length)) {
        return false
    }
    return (a.every((element, index) => element === b[index]));
}