function numIslands(grid: string[][]): number {
    if (grid.length === 0) return 0;

    let count = 0;
    const rows = grid.length;
    const cols = grid[0].length;

    function dfs(r: number, c: number) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') return;
        grid[r][c] = '0'; // Mark the cell as visited
        dfs(r + 1, c); // Down
        dfs(r - 1, c); // Up
        dfs(r, c + 1); // Right
        dfs(r, c - 1); // Left
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === '1') {
                count++;
                dfs(r, c);
            }
        }
    }

    return count;
}

module.exports = { numIslands };