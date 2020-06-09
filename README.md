# MCP-Modificator
This is a tool that will help modify the [Mod Coder Pack](http://modcoderpack.com) for newer versions of Minecraft.<br>

# Prerequisites
- Java Runtime Environment 1.8+<br>
- Java Development Kit 8+<br>
- Generally a good knowledge of whatever the hell you're doing.

# How To Use
Run modify_mcp.bat. It should be relatively straightforward.<br>
If you're using MacOS X or Linux, grab Node.js for your current operating system and then run `node scripts/core.js`<br>
There may be some little bugs that I may have missed, so if you know how to use this, please help fix them?

# Known Issues
> MCPConfig does not build automatically.
>> This is an issue I personally don't know how to fix. If you know how to point Gradle towards building MCPConfig, please tell me or submit a pull request! That would be greatly appreciated!

# Acknowledgements
- [The Mod Coder Pack team for MCP.](http://modcoderpack.com)
- [The Minecraft Forge team for MCPConfig.](https://github.com/MinecraftForge/MCPConfig)
- [ThisTestUser for their MCPFixer tool and their really neat tutorial on how to fix MCP.](https://github.com/ThisTestUser/MCPFixer)
- All of you for being here! <333

# Changelog
> 1.0.1
- MCP-Modificator now downloads the patches for your specific version.
- You can now run the Gradle stuff and rerun the code to properly get the patches working.
- Reworked the code to now hopefully work for MacOS X and Linux.
- MCP-Modificator now downloads ForgeFlower 1.5.380.40 for Minecraft 1.15.2.
- MCPConfig now gets redownloaded every time you use a different version of Minecraft.