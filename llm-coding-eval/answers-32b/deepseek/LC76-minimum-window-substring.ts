module.exports = {
    minWindow: (s: string, t: string) => {
        let mapT = new Map<string, number>();
        for(let i = 0; i < t.length; i++){
            if(!mapT.has(t[i])){
                mapT.set(t[i], 1);
            } else {
                let count = mapT.get(t[i]) || 0;
                mapT.set(t[i], count + 1);
            }
        }
        
        let left = 0, right = 0, minLen = Number.MAX_SAFE_INTEGER, minStart = 0, counter = mapT.size;
        while(right < s.length){
            if(mapT.has(s[right])){
                let count = mapT.get(s[right]) || 0;
                mapT.set(s[right], count - 1);
                if(count === 1) counter--;
            }
            
            right++;
            
            while(counter === 0){
                if(mapT.has(s[left])){
                    let count = mapT.get(s[left]) || 0;
                    mapT.set(s[left], count + 1);
                    if(count === 0) counter++;
                }
                
                if(right - left < minLen){
                    minLen = right - left;
                    minStart = left;
                }
                
                left++;
            }
        }
        
        return minLen === Number.MAX_SAFE_INTEGER ? "" : s.substring(minStart, minStart + minLen);
    }
}