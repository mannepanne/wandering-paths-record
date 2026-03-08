# Session Context

## User Prompts

### Prompt 1

Here's an interesting one. I just went back and updated my visit history to one of my all time favourite restaurants, Levan in Peckham. It now have vists dating all the way back to 29th February 2020. About 8 visits I think in total. But on the restaurant page I only see five vists listed. Why is that?

### Prompt 2

I think this is a good time to talk about TD-005 and TD-006 in @REFERENCE/technical-debt.md 

It's clear that when I have made more than two vists, this simple display approach with listing all visits on the restaurant page in an untruncated list isn't great. It breaks the layout.

We should do something like show only the latest two visits on the restaurant page, and then either a mdoal that opens with a paginated list, focused on just showing all the visists in the history, or a sub page fo...

### Prompt 3

Yes, that aligns very well. Do we need to some further thinking and specification on this, or is it small-ish enough to just go ahead? Any questions you have before starting?

### Prompt 4

1. I think keep the header (see image attached), and the first on the page, spanning full width, keep also the Description field. And then the visits come below.

2. Click the note text itself to expand.

3. Place a "← Back to [restaurant name]" in the header, where we have the "← Back to List" on the restaurant details page.

### Prompt 5

That looks amazing! Just what I had in mind. However, on the restaurant details page, even though we now only show the two latest visits, the list still stacks too high vertically. See the attached image, loads of empty space above and below the "Smart Review Summary".

I still want the two latest visits maximum, but shorten the display of the visit text to about half of what it is now. And remove the horizontal divider line. Also, I think remove the "View all visits" link at the bottom, and ...

### Prompt 6

Do you think we can put the ratings marker (eg "Must visit!") on the same row as the date and the edit icons in the visit list without it looking too cramped? Right aligned together with the pen and the trash can icons, so they line up neatly vertically?

### Prompt 7

Perfect! I think we should make a PR of this on GitHub.

