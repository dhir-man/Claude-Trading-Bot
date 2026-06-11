function numIslands(grid: string[][]): number {
    let count = 0;
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            if (grid[i][j] === '1') {
                count++;
                dfs(grid, i, j);
            }
        }
    }
    return count;
}

function dfs(grid: string[][], i: number, j: number) {
    if (i < 0 || j < 0 || i >= grid.length || j >= grid[i].length || grid[i][j] === '0') {
        return;
    }
    grid[i][j] = '0'; // mark as visited
    dfs(grid, i - 1, j);
    dfs(grid, i + 1, j);
    dfs(grid, i, j - 1);
    dfs(grid, i, j + 1);
}

module.exports = { numIslands }