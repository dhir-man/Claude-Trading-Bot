module.exports = {
    reverseList(head: number[]): number[] {
        let left = 0;
        let right = head.length - 1;
        
        while (left < right) {
            const temp = head[left];
            head[left] = head[right];
            head[right] = temp;
            
            left++;
            right--;
        }
        
        return head;
    }
};