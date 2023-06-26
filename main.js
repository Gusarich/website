const developments = [
    {
        name: 'Jetton Migration',
        link: 'https://github.com/Gusarich/jetton-migration',
        description:
            'Smart contract for the migration of Jettons to new versions',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'Multisig dApp',
        link: 'https://github.com/Gusarich/multisig-dapp',
        description:
            'User-friendly web interface for interacting with Multi-signature wallets in TON',
        status: 'Completed',
        type: 'Website',
    },
    {
        name: 'TS Multisig library',
        link: 'https://github.com/puppycats/multisig',
        description:
            'TypeScript library for interacting with multisig wallets in TON, which was later integrated into the `ton` library',
        status: 'Completed',
        type: 'Tool',
    },
    {
        name: 'funcexec',
        link: 'https://github.com/Gusarich/funcexec',
        description: 'Pure FunC executor',
        status: 'Completed',
        type: 'Tool',
    },
    {
        name: 'Simple TON DNS Subdomain',
        link: 'https://github.com/Gusarich/simple-subdomain',
        description:
            'Simple and efficient smart contract for creating subdomains in TON DNS',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'Fake NFT',
        link: 'https://github.com/Gusarich/fake-nft',
        description:
            'Lightest and cheapest possible implementation of NFT on TON Blockchain',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'Fake Jetton',
        link: 'https://github.com/Gusarich/fake-jetton',
        description:
            'Lightest and cheapest possible implementation of Jetton on TON Blockchain',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'Backed Jetton',
        link: 'https://github.com/Gusarich/backed-jetton',
        description: 'Smart contract for Jettons backed by Toncoin',
        status: 'In progress',
        type: 'Smart Contract',
    },
    {
        name: 'TON Mass Sender',
        link: 'https://github.com/Gusarich/ton-mass-sender',
        description:
            'User-friendly tool for sending Toncoin to many addresses at once',
        status: 'Completed',
        type: 'Smart Contract, Tool',
    },
    {
        name: 'TON Cheques',
        link: 'https://github.com/Gusarich/ton-cheques',
        description:
            'Smart contract & Web interface for decentralized cheques on TON blockchain',
        status: 'Completed',
        type: 'Smart Contract, Website',
    },
    {
        name: 'Scalable Airdrop System',
        link: 'https://github.com/Gusarich/airdrop',
        description: 'Smart contract for scalable airdrops on TON blockchain',
        status: 'In progress',
        type: 'Smart Contract',
    },
    {
        name: 'TON Single Token',
        link: 'https://github.com/Gusarich/ton-single-token',
        description: 'Implementation of ERC20-like token for TON blockchain',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'TON Random',
        link: 'https://github.com/puppycats/ton-random',
        description:
            'Smart contract for unpredictable random number generation on TON blockchain',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'External Scheduler',
        link: 'https://github.com/Gusarich/external-scheduler',
        description: 'TON Scheduler based on External messages',
        status: 'Completed',
        type: 'Smart Contract',
    },
    {
        name: 'TON Shards',
        link: 'https://github.com/Gusarich/ton-shards',
        description: 'Beautiful explorer of shardchains in TON Blockchain',
        status: 'In progress',
        type: 'Website',
    },
    {
        name: 'BreakTON',
        link: 'https://github.com/Gusarich/breakton',
        description:
            'A simple game that demonstrates the throughput and speed of the TON Blockchain',
        status: 'In progress',
        type: 'Smart Contract, Website',
    },
];

function main() {
    // Show the notification if on the .com domain
    if (!window.location.hostname.endsWith('.ton')) {
        let notification = document.getElementById('redirectNotification');
        let yesButton = document.getElementById('yesButton');
        let noButton = document.getElementById('noButton');

        noButton.onclick = function () {
            notification.style.display = 'none';
        };

        yesButton.onclick = function () {
            window.location.href = (
                window.location.href.slice(
                    0,
                    window.location.href.lastIndexOf('.')
                ) + '.ton'
            ).replace('https', 'http');
        };

        notification.style.display = 'block';
    }

    const mainContentElement = document.querySelector('main');

    const types = [
        ...new Set(developments.map((item) => item.type.split(', ')).flat()),
    ]; // Get unique types

    types.forEach((type) => {
        const projectsOfType = developments.filter((item) =>
            item.type.split(', ').includes(type)
        );

        let tableHTML = '';

        projectsOfType.forEach((project) => {
            let row = `
            <tr>
                <td><a href="${project.link}" target="_blank">${project.name}</a></td>
                <td>${project.description}</td>
                <td>${project.status}</td>
            </tr>`;

            tableHTML += row;
        });

        // Create a new project type section
        let projectTypeHTML = `
        <div class="project-type">
            <h2>${type}s</h2>
            <table id="project-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableHTML}
                </tbody>
            </table>
        </div>`;

        mainContentElement.innerHTML += projectTypeHTML; // Append the new section to the main content
    });
}

document.addEventListener('DOMContentLoaded', main);
