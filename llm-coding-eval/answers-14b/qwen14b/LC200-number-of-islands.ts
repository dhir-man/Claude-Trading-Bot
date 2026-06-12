function numIslands(grid: string[][]): number {
    if (!grid || grid.length === 0) return 0;

    const numRows = grid.length;
    const numCols = grid[0].length;
    let islandCount = 0;

    const dfs = (row: number, col: number) => {
        if (row < 0 || row >= numRows || col < 0 || col >= numCols || grid[row][col] === '0') return;

        grid[row][col] = '0'; // Mark the cell as visited

        // Explore all four directions
        dfs(row + 1, col);
        dfs(row - 1, col);
        dfs(row, col + 1);
        dfs(row, col - 1);
    };

    for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
            if (grid[row][col] === '1') {
                islandCount++;
                dfs(row, col); // Start DFS to mark the entire island
            }
        }
    }

    return islandCount;
}

module.exports = { numIslands };