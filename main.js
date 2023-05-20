const projects = [
    {
        name: 'Jetton Migration',
        link: 'https://github.com/Gusarich/jetton-migration',
        description:
            'Smart contract for the migration of Jettons to new versions',
        status: 'Completed',
    },
    {
        name: 'Multisig dApp',
        link: 'https://github.com/Gusarich/multisig-dapp',
        description:
            'User-friendly web interface for interacting with Multi-signature wallets in TON',
        status: 'Completed',
    },
    {
        name: 'TS Multisig library',
        link: 'https://github.com/puppycats/multisig',
        description:
            'TypeScript library for interacting with multisig wallets in TON, which was later integrated into the `ton` library',
        status: 'Completed',
    },
    {
        name: 'funcexec',
        link: 'https://github.com/Gusarich/funcexec',
        description: 'Pure FunC executor',
        status: 'Completed',
    },
    {
        name: 'Fake NFT',
        link: 'https://github.com/Gusarich/fake-nft',
        description:
            'Lightest and cheapest possible implementation of NFT on TON Blockchain',
        status: 'Completed',
    },
    {
        name: 'Fake Jetton',
        link: 'https://github.com/Gusarich/fake-jetton',
        description:
            'Lightest and cheapest possible implementation of Jetton on TON Blockchain',
        status: 'Completed',
    },
    {
        name: 'Backed Jetton',
        link: 'https://github.com/Gusarich/backed-jetton',
        description: 'Smart contract for Jettons backed by Toncoin',
        status: 'In progress',
    },
    {
        name: 'TON Mass Sender',
        link: 'https://github.com/Gusarich/ton-mass-sender',
        description:
            'User-friendly tool for sending Toncoin to many addresses at once',
        status: 'Completed',
    },
    {
        name: 'TON Cheques',
        link: 'https://github.com/Gusarich/ton-cheques',
        description:
            'Smart contract & Web interface for decentralized cheques on TON blockchain',
        status: 'Completed',
    },
    {
        name: 'Scalable Airdrop System',
        link: 'https://github.com/Gusarich/airdrop',
        description: 'Smart contract for scalable airdrops on TON blockchain',
        status: 'In progress',
    },
    {
        name: 'TON Single Token',
        link: 'https://github.com/Gusarich/ton-single-token',
        description: 'Implementation of ERC20-like token for TON blockchain',
        status: 'Completed',
    },
    {
        name: 'TON Random',
        link: 'https://github.com/puppycats/ton-random',
        description:
            'Smart contract for unpredictable random number generation on TON blockchain',
        status: 'Completed',
    },
    {
        name: 'Simple TON DNS Subdomain',
        link: 'https://github.com/Gusarich/simple-subdomain',
        description:
            'Simple and efficient smart contract for creating subdomains in TON DNS',
        status: 'In progress',
    },
    {
        name: 'TON Shards',
        link: 'https://github.com/Gusarich/ton-shards',
        description: 'Beautiful explorer of shardchains in TON Blockchain',
        status: 'In progress',
    },
    {
        name: 'BreakTON',
        link: 'https://github.com/Gusarich/breakton',
        description:
            'A simple game that demonstrates the throughput and speed of the TON Blockchain',
        status: 'In progress',
    },
];

window.onload = function () {
    let list = [[], []];
    projects.forEach((project) => {
        if (project.status == 'In progress') list[0].push(project);
        else if (project.status == 'Completed') list[1].push(project);
    });
    let table = [];
    const mx = Math.max(list[0].length, list[1].length);

    for (let i = 0; i < mx; i++) {
        table.push([list[0][i], list[1][i]]);
    }

    const tableBody = document
        .getElementById('project-table')
        .getElementsByTagName('tbody')[0];

    table.forEach((projects) => {
        const newRow = tableBody.insertRow();
        projects.forEach((project) => {
            const newCell = newRow.insertCell();
            if (project)
                newCell.innerHTML = `<a href="${project.link}"><strong>${project.name}</strong></a><br><p>${project.description}</p>`;
        });
    });
};
