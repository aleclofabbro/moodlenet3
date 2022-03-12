  
const extensions = []
extensions.push( [ '@moodlenet/kernel', require('@moodlenet/kernel/lib/v1/webapp').Cmp ] )

module.exports = extensions
module.exports.default = extensions
